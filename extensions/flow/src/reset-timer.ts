import { showHUD, Toast } from "@raycast/api";
import { isFlowInstalled, resetTimer, startTimer } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Resetting timer",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  await resetTimer();
  await startTimer();
  await showHUD("Timer reset");
}
