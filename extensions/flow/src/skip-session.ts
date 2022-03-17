import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";

export default async function skipSession() {
  const toast = new Toast({
    title: "Skipping session",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to skip');
  await showHUD("Session skipped");
}
