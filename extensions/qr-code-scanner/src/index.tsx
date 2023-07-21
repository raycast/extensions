import {
  closeMainWindow,
  confirmAlert,
  copyTextToClipboard,
  getPreferenceValues,
  popToRoot,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { exec } from "child_process";
import open from "open";
import { read as decodeImage } from "jimp";
import { randomInt } from "crypto";
import jsQR from "jsqr";

interface Preferences {
  captureMode: "area" | "fullscreen";
  silence: boolean;
}

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
    const result = jsQR(new Uint8ClampedArray(image.bitmap.data.buffer), image.bitmap.width, image.bitmap.height, {
      inversionAttempts: "attemptBoth",
    });
    exec(`rm ${filepath}`);
    if (result) {
      const decoder = new TextDecoder("shift-jis");
      const code = decoder.decode(Uint8Array.from(result?.binaryData).buffer);
      callback(code);
      return;
    }
    callback(false);
  });
}

function trigger(randName: string, preferences: Preferences, displayNumber = 1) {
  closeMainWindow();

  function captureScreenCommand(): string {
    switch (preferences.captureMode) {
      case "fullscreen":
        return `/usr/sbin/screencapture ${
          preferences.silence ? "-x" : ""
        } -D ${displayNumber.toString()} /tmp/shotTemp${randName}.jpg`;
      default:
        return `/usr/sbin/screencapture ${preferences.silence ? "-x" : ""} -i /tmp/shotTemp${randName}.jpg`;
    }
  }

  exec(captureScreenCommand(), function (exception) {
    if (exception && exception.message.indexOf("Invalid display specified") > -1) {
      showHUD("No QR Code Found on Any Screen :(");
      popToRoot();
    }
    qrDecode("/tmp/shotTemp" + randName + ".jpg", (data: string | boolean) => {
      if (!data && preferences.captureMode === "fullscreen") {
        trigger(randName, preferences, displayNumber + 1);
      } else if (!data) {
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

export default function main() {
  const randName = randomInt(100, 999).toString();
  const preferences = getPreferenceValues<Preferences>();
  trigger(randName, preferences);
}
