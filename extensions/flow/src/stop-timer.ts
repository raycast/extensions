import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { isFlowInstalled, stopTimer } from "./utils";

export default async function () {
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

  await stopTimer();
  await showHUD("Timer stopped");
}
