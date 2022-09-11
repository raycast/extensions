import { useState } from "react";
import { showHUD, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Copy the URL to the clipboard
    Promise.resolve(
      runAppleScript(`tell application "Bike"
      set theURL to URL of document 1
      set the clipboard to theURL
    end tell`)
    );

    showHUD("Copied URL to clipboard!");

    // Close the Raycast window
    Promise.resolve(popToRoot());
  }
}
