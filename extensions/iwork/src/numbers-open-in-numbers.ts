import { useState } from "react";
import { popToRoot, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkNumbersInstalled } from "./index";

export default function Main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  // Check for Keynote app
  const error_alert = checkNumbersInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Create slideshow
    Promise.resolve(
      runAppleScript(`tell application "Finder"
        set fileList to {}
        set selectedFiles to selection as alias list
        repeat with theFile in selectedFiles
            set end of fileList to theFile
        end repeat
    end tell

    tell application "Numbers"
        repeat with theFile in fileList
            open theFile
        end repeat
    end tell`)
    );
    popToRoot();
    closeMainWindow();
  }
}
