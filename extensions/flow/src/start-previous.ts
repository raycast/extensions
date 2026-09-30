import { showHUD, Toast } from "@raycast/api";
import { isFlowInstalled, previousSession, startTimer } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting previous session",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  // `previous` reloads the last session (keeping its title); `start` runs it.
  await previousSession();
  await startTimer();
  await showHUD("Previous session started");
}
