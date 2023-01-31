import { useEffect } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    runAppleScript('tell application "Bike" to set the miniaturized of every window to true').then(() =>
      showHUD("Minimized Bike").then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
