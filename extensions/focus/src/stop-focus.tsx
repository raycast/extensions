import { Toast, showToast, showHUD } from "@raycast/api";
import { stopFocus, isBreakRunning } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function () {
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
  await showHUD("Focus stopped");
}
