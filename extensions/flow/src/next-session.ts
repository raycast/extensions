import { showHUD, showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function nextSession() {
  if (!(await isFlowInstalled())) {
    await showToast(ToastStyle.Failure, "Flow is not installed", "Install it from: https://flowapp.info/download");
    return;
  }
  const phase = await runAppleScript('tell application "Flow" to getPhase');
  await runAppleScript('tell application "Flow" to skip');
  if (phase === "Flow") {
    await runAppleScript('tell application "Flow" to skip');
  }
  await runAppleScript('tell application "Flow" to start');
  await showHUD("Next session started");
}
