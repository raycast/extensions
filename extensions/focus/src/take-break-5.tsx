import { Toast, showToast } from "@raycast/api";
import { getInstallStatus, getProfileNames, takeBreakWithProfile5, takeBreak5, isBreakRunning } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking break status...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const breakRunning = await isBreakRunning();

  if (breakRunning) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Break already running",
      message: "There is an active break in progress.",
    });
    return;
  }

  toast.title = "Starting break (5 minutes)...";

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    if (profiles.length === 0) {
      await takeBreak5();
    } else {
      await takeBreakWithProfile5(firstProfile);
    }
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: firstProfile ? `Break started with profile: ${firstProfile} (5 minutes)` : "Break started (5 minutes)",
    });
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start break",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
