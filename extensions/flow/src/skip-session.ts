import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { isFlowInstalled, skipSession } from "./utils";

export default async function () {
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

  await skipSession();
  await showHUD("Session skipped");
}
