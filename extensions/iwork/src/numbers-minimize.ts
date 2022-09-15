import { useState } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkNumbersInstalled } from "./index";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkNumbersInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    Promise.resolve(runAppleScript('tell application "Numbers" to set the miniaturized of every window to true'));
    showHUD("Minimized Numbers");
    Promise.resolve(popToRoot());
  }
}
