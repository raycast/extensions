import { runAppleScript } from "run-applescript";
import { closeMainWindow, Toast, ToastStyle } from "@raycast/api";
import { isFlowInstalled } from "./utils";

export default async function hideTimer() {
  const toast = new Toast({
    title: "Hiding timer",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to hide');
  await closeMainWindow();
}
