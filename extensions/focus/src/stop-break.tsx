import { Toast, showToast, showHUD } from "@raycast/api";
import { getProfileNames, stopBreak, stopBreakWithProfile } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function Command() {
  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping break...",
  });

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    if (profiles.length === 0) {
      await stopBreak();
    } else {
      await stopBreakWithProfile(firstProfile);
    }
    await toast.hide();
    await showHUD("Break stopped");
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop break",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
