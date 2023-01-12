import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function resetTimer() {
  const toast = new Toast({
    title: "Resetting timer",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to reset');
  await runAppleScript('tell application "Flow" to start');
  await showHUD("Timer reset");
}
