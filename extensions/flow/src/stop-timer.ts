import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function stopTimer() {
  const toast = new Toast({
    title: "Stopping timer",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to stop');
  await showHUD("Timer stopped");
}
