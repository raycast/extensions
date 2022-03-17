import { showHUD, Toast, ToastStyle } from "@raycast/api";
import { getCurrentPhase, isFlowInstalled, resetTimer, skipSession } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting next session",
    style: ToastStyle.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = ToastStyle.Failure;
    return;
  }

  const phase = await getCurrentPhase();
  if (phase === "Flow") {
    await skipSession();
  } else {
    await resetTimer();
  }
  await showHUD("Break session started");
}
