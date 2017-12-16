var keypress = require('keypress');
var rxjs = require('rxjs');
var dronejs = require('dronejs');

keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

// あなたのMamboの名前をセットしてください。
var DRONE_NAME = "Mambo_637131";

/**
 * 写真撮影関数
*/
function takePic() {
  return dronejs.takePicture()
  .then(() => dronejs.listAllPictures())
  .then(pictures => {
    targetPic = pictures[0];
    return dronejs.flatTrim();
  });
}

// listen for the "keypress" event
process.stdin.on('keypress', function (ch, key) {
  console.log('got "keypress" => ', key);
  if (key) {
    if (key.name === 'x') {
      // xキーを押すとプログラムを終了する。
      console.log('close. bye.');
      process.stdin.pause();
      process.exit();
    }
  }
});

// Droneにある最新の画像をダウンロードする
function download() {
  var targetPic;
  console.log('download start');
  return dronejs.listAllPictures()
    .then(pictures => {console.log(pictures); targetPic = pictures[0]})
    .then(() => dronejs.downloadPicture(targetPic, 'output'))
    .then((response)=> {
      if (response === 'success') {
        console.log('picture downloaded successfully...');
      } else {
        console.log(response);
      }
    });
}

function downloadAllPictures() {
  console.log('download start');
  return dronejs.listAllPictures()
    .then(pictures => {
      console.log(pictures);
      const numPictures = pictures.length;
      let numDownloaded = 0;
      return new Promise((resolve, reject) => {
        pictures.forEach((targetPic) => {
          dronejs.downloadPicture(targetPic, 'output')
            .then((response)=> {
              if (response === 'success') {
                console.log(targetPic + ": picture downloaded successfully...");
                numDownloaded += 1;
                if (numDownloaded === numPictures) {
                  resolve('success');
                }
              } else {
                console.log(response);
                reject(response);
              }
            })
            .catch((err) => {
              reject(err);
            });
        })
      });
    })
}

/**
 * ドローンを動かします
 *
 * 使い方:
 *   dronejs.connect(DRONE_NAME)から初めて、.thenで処理を続けて書いていきます。
 *   最後は.catch()でエラー処理を書いて、;を書いて処理を終了させます。
 *
 * コマンド:
 *
 *   飛行状態を変化:
 *     離陸   : dronejs.takeOff()
 *     安定化 : dronejs.flatTrim() : 離陸前に必ず1度呼ぶ
 *     着陸   : dronejs.land()
 *
 *   移動:
 *     前進     : dronejs.forward()   : 引数には、進む強さと回数を指定する
 *     後退     : dronejs.backward()  : 引数には、進む強さと回数を指定する
 *     右に進む : dronejs.right()     : 引数には、進む強さと回数を指定する
 *     左に進む : dronejs.left()      : 引数には、進む強さと回数を指定する
 *     上昇     : dronejs.up()        : 引数には、進む強さと回数を指定する
 *     下降     : dronejs.down()      : 引数には、進む強さと回数を指定する
 *     右を向く : dronejs.turnRight() : 引数には回転の強さと回数を指定する
 *     左を向く : dronejs.turnLeft()  : 引数には回転の強さと回数を指定する
 *
 *   Grabberを動かす:
 *     つかむ: dronejs.grabClose()
 *     はなす: dronejs.grabOpen()
 *
 *   アクロバット:
 *     前転     : dronejs.frontFlip()
 *     後転     : dronejs.backFlip()
 *     側転(右) : dronejs.rightFlip()
 *     側転(左) : dronejs.leftFlip()
 *
 *   写真:
 *     撮影         : dronejs.takePicture()
 *     一覧を取得   : dronejs.listAllPictures()
 *     ダウンロード : dronejs.downloadPicture()
 *     画像を削除   : dronejs.deletePicture()
 *
 *   その他:
 *     ログを出力する           : dronejs.enableLogging()  : 引数にログを出すディレクトリを指定
 *     ドローンの状態を確認する : dronejs.checkAllStates() : ドローンの詳しい状態が送られてきます
 *
 */
function main() {
  console.log('start')

  // ドローンの状態を受け取るイベントストリーム(rxjsのObservableオブジェクト)を取得します
  const navDataStream = dronejs.getNavDataStream();
  navDataStream.subscribe((data) => {
       console.log(data);
    },
    e => debug(e),
    () => debug('complete')
  );

  const forwardIndensity = 50;
  const forwardTimes = 1;
  // ここから処理を書いていきます
  dronejs.connect(DRONE_NAME)
    // 飛ぶ前に一度平坦な状態を覚える
    .then(() => dronejs.flatTrim())
    // 物を掴んで離陸
    .then(() => dronejs.grabClose())
    .then(() => dronejs.takeOff())
    // 前進しながら写真を撮る
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    .then(() => dronejs.takePicture())
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    .then(() => dronejs.takePicture())
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    // 着陸して分析する
    .then(() => dronejs.land())
    .then(() => downloadAllPictures())

    // 離陸する
    .then(() => dronejs.flatTrim())
    .then(() => dronejs.takeOff())
    // 反転して、戻る
    .then(() => dronejs.turnRight(90, 7))
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    .then(() => dronejs.grabOpen())
    .then(() => dronejs.forward(forwardIndensity, forwardTimes))
    // 着陸する
    .then(() => dronejs.land())
    // 接続解除
    .then(() => dronejs.disconnect())
    .then(() => {
      process.stdin.pause();
      process.exit();
    })
    .catch((e) => {
      console.log('エラー: ' + e);
      process.stdin.pause();
      process.exit();
    });
}

main(); // 関数を実行します
