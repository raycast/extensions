import { useState } from "react";
import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default function Main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkPagesInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    Promise.resolve(Clipboard.readText()).then((clipboardText) => {
      const text = clipboardText?.replaceAll('"', '\\"');
      Promise.resolve(
        runAppleScript(`tell application "Pages"
            make new document with properties {body text: "${text}"}
        end tell`)
      ).then((_result) => {
        showHUD("Creating new Pages document from clipboard text...");
        popToRoot();
      });
    });
  }
}
