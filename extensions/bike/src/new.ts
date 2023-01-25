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
    runAppleScript(`tell application "Bike"
      activate  
      make new document
    end tell`).then(() => showHUD("Created New Bike Document").then(() => Promise.resolve(popToRoot())));
  }, []);
}
