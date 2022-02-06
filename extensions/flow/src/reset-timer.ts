import { showHUD, showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function resetTimer() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "Install it from: https://flowapp.info/download");
    return;
  }
  await runAppleScript('tell application "Flow" to reset');
  await runAppleScript('tell application "Flow" to start');
  await showHUD("Timer reset");
}
