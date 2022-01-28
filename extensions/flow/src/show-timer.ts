import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";
import { showToast, ToastStyle } from "@raycast/api";

export default async function showTimer() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "https://flowapp.info/");
    return;
  }
  await runAppleScript('tell application "Flow" to show');
}
