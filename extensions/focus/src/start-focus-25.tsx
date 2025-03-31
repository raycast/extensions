import { Toast, showToast } from "@raycast/api";
import { getProfileNames, startFocusWithProfile25, startFocus25, getActiveProfileName } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus (25 minutes)...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const activeProfile = await getActiveProfileName();
  if (activeProfile) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus session already running",
      message: `Profile "${activeProfile}" is currently active`,
    });
    return;
  }

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    if (profiles.length === 0) {
      await startFocus25();
    } else {
      await startFocusWithProfile25(firstProfile);
    }
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: firstProfile ? `Focus started with profile: ${firstProfile} (25 minutes)` : "Focus started (25 minutes)",
    });
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start Focus",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
