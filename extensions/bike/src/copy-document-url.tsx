import { useEffect } from "react";
import { showHUD, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    // Copy the URL to the clipboard
    runAppleScript(`tell application "Bike"
        set theURL to URL of document 1
        set the clipboard to theURL
      end tell`).then(() => showHUD("Copied Document URL To Clipboard!").then(() => Promise.resolve(popToRoot())));
  }, []);
}
