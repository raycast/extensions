import { Toast, showToast } from "@raycast/api";
import { getProfileNames, stopBreak, stopBreakWithProfile } from "./utils";
import { ensureFocusIsRunning } from "./helpers";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping break...",
  });

  if (!(await ensureFocusIsRunning())) {
    return;
  }

  const profiles = await getProfileNames();
  const firstProfile = profiles[0];

  try {
    if (profiles.length === 0) {
      await stopBreak();
    } else {
      await stopBreakWithProfile(firstProfile);
    }
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Break stopped",
    });
  } catch (error) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop break",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
