import { useState } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkPagesInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    Promise.resolve(
      runAppleScript(`tell application "Pages"
      activate  
      make new document
    end tell`)
    );
    showHUD("Created new Pages document");
    Promise.resolve(popToRoot());
  }
}
