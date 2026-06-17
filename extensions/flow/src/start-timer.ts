import { showHUD, Toast } from "@raycast/api";
import { isFlowInstalled, startTimer } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting timer",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  await startTimer();
  await showHUD("Timer started");
}
