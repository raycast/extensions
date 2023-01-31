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
    // Copy row URL to the clipboard
    runAppleScript(`tell application "Bike"
            set theText to URL of selection row of document 1
            set the clipboard to theText
        end tell`).then(() => showHUD("Copied Row URL To Clipboard!").then(() => Promise.resolve(popToRoot())));
  }, []);
}
