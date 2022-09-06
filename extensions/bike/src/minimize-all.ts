import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    console.log("hi");
    return error_alert;
  }

  Promise.resolve(closeMainWindow());
  Promise.resolve(runAppleScript('tell application "Bike" to set the miniaturized of every window to true'));
}
