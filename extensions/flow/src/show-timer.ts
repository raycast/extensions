import { isFlowInstalled, showTimer } from "./utils";
import { Toast, ToastStyle } from "@raycast/api";

export default async function () {
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

  await showTimer();
}
