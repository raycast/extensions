import { showHUD, showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function startTimer() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "https://flowapp.info/");
    return;
  }
  await runAppleScript('tell application "Flow" to start');
  await showHUD("Timer started");
}
