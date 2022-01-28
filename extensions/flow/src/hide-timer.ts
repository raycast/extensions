import { runAppleScript } from "run-applescript";
import { closeMainWindow, showToast, ToastStyle } from "@raycast/api";
import { isFlowInstalled } from "./utils";

export default async function hideTimer() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "https://flowapp.info/");
    return;
  }
  await runAppleScript('tell application "Flow" to hide');
  await closeMainWindow();
}
