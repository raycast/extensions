import {
  closeMainWindow,
  confirmAlert,
  copyTextToClipboard, popToRoot,
  showHUD
} from "@raycast/api";
import { exec } from "child_process";
import open from "open";
import { read as decodeImage } from "jimp";
import qrcodeReader from "qrcode-reader";
import { randomInt } from "crypto";

function qrDecode(filepath: string, callback: (data: string | boolean) => void) {
  decodeImage(filepath, (err, image) => {
    if (err) {
      confirmAlert({title: 'Image decoder error...'})
        .then(() => callback(false))
    }
    const decodeQR = new qrcodeReader();
    decodeQR.callback = function(errorWhenDecodeQR, result) {
      if (errorWhenDecodeQR) {
        confirmAlert({
          title: 'Parser error...',
        }).then(() => callback(false))
      }
      if (!result) {
        callback(false)
      } else {
        callback(JSON.parse(JSON.stringify(result)).result)
      }
      exec('rm ' + filepath)
    };
    decodeQR.decode(image.bitmap);
  });
}

function trigger(randName: string) {
  closeMainWindow();

  exec("/usr/sbin/screencapture -i /tmp/shotTemp" + randName + ".jpg", function() {
    qrDecode("/tmp/shotTemp" + randName + ".jpg", (data: string | boolean) => {
      if (data === false) {
        showHUD("No QR Code Found :(");
      } else if (typeof data === "string") {
        copyTextToClipboard(data)
        if (data.match(/[a-zA-z]+:\/\/[^\s]*/)) {
          confirmAlert({
            title: "Open in browser? ",
            message: data,
            primaryAction: {
              title: "Open",
              onAction: () => {
                open(data)
              }
            }
          });
        } else {
          showHUD('Copied: ' + (data.length > 20 ? data.substring(0, 30) + '...' : data))
        }
      }
      popToRoot()
    })
  })

}

export default async function main() {
  const randName = randomInt(100, 999).toString()
  trigger(randName)
}
