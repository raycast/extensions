import { runAppleScript } from "run-applescript";
import { showHUD, showToast, ToastStyle } from "@raycast/api";
import { isFlowInstalled } from "./utils";

export default async function quitFlow() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "https://flowapp.info/");
    return;
  }
  await runAppleScript('tell application "Flow" to quit');
  await showHUD("Flow has been closed");
}
