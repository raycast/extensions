import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { getTrackingState, clearTrackingState } from "./storage";
import { stopTimer } from "./api";
import { formatDuration, getElapsedTime } from "./utils";

export default async function Command() {
  const state = await getTrackingState();

  if (!state.isTracking || !state.issueKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Active Timer",
      message: "There is no timer currently running",
    });
    return;
  }

  const elapsed = state.startedAt ? getElapsedTime(state.startedAt) : 0;

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Timer...",
      message: state.issueKey,
    });

    await stopTimer(state.issueKey);
    await clearTrackingState();

    await showToast({
      style: Toast.Style.Success,
      title: "Timer Stopped",
      message: `Logged ${formatDuration(elapsed)} to ${state.issueKey}`,
    });

    try {
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch {
      // Menu bar refresh is optional
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Stop Timer",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
