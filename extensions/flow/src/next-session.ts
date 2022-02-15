import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function nextSession() {
  const toast = new Toast({
    title: "Starting next session",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
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
