import { closeMainWindow, Clipboard, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  closeMainWindow();
  Promise.resolve(runAppleScript(`tell application "Bike" to return URL of document 1`)).then((url) =>
    Promise.resolve(Clipboard.copy(url)).then(() => showHUD("Copied URL to clipboard!"))
  );
}
