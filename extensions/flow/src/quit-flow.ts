import { runAppleScript } from "run-applescript";
import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { isFlowInstalled } from "./utils";

export default async function quitFlow() {
  const toast = new Toast({
    title: "Quitting Flow",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  await runAppleScript('tell application "Flow" to quit');
  await showHUD("Flow has been closed");
}
