import {
  closeMainWindow,
  confirmAlert,
  copyTextToClipboard,
  popToRoot,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { exec } from "child_process";
import open from "open";
import { read as decodeImage } from "jimp";
import qrcodeReader from "qrcode-reader";
import { randomInt } from "crypto";

function qrDecode(filepath: string, callback: (data: string | boolean) => void) {
  decodeImage(filepath, (err, image) => {
    if (!image) {
      popToRoot();
      return;
    }
    if (err) {
      showToast(ToastStyle.Failure, "Image decoder error...");
      return;
    }
    const decodeQR = new qrcodeReader();
    decodeQR.callback = function (errorWhenDecodeQR, result) {
      if (errorWhenDecodeQR) {
        if (errorWhenDecodeQR.indexOf("Couldn't find enough finder patterns") > -1) {
          callback(false);
        } else {
          showToast(ToastStyle.Failure, "Parser error...");
          return;
        }
      } else {
        callback(JSON.parse(JSON.stringify(result)).result);
      }
      exec("rm " + filepath);
    };
    decodeQR.decode(image.bitmap);
  });
}

function trigger(randName: string) {
  closeMainWindow();

  exec("/usr/sbin/screencapture -i /tmp/shotTemp" + randName + ".jpg", function () {
    qrDecode("/tmp/shotTemp" + randName + ".jpg", (data: string | boolean) => {
      if (data === false) {
        showHUD("No QR Code Found :(");
        popToRoot();
      } else if (typeof data === "string") {
        copyTextToClipboard(data);
        if (data.match(/[a-zA-z]+:\/\/[^\s]*/)) {
          confirmAlert({
            title: "Open in Browser?",
            message: data,
            primaryAction: {
              title: "Open",
              onAction: () => {
                open(data).then(() => {
                  closeMainWindow();
                  popToRoot();
                });
              },
            },
            dismissAction: {
              title: "Cancel",
              onAction: () => popToRoot(),
            },
          });
        } else {
          showHUD("Copied: " + (data.length > 20 ? data.substring(0, 30) + "..." : data));
          popToRoot();
        }
      }
    });
  });
}

export default async function main() {
  const randName = randomInt(100, 999).toString();
  trigger(randName);
}
