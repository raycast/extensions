import { runAppleScript } from "run-applescript";
import { isFlowInstalled } from "./utils";
import { Toast, ToastStyle } from "@raycast/api";

export default async function showTimer() {
  const toast = new Toast({
    title: "Showing timer",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to show');
}
