import { Toast, showToast } from "@raycast/api";
import { getInstallStatus, stopFocus, isBreakRunning } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function () {
  if (!(await getInstallStatus())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus is not installed",
      message: "Install Focus app from: https://heyfocus.com",
    });
    return;
  }

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const breakRunning = await isBreakRunning();

  if (breakRunning) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Break is currently running",
      message: "Please stop the break first before stopping focus",
    });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Stopping focus..." });
  await stopFocus();
  await showToast({ style: Toast.Style.Success, title: "Focus stopped" });
}
