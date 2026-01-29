import { showToast, Toast } from "@raycast/api";
import {
  getCurrentTimeEntry,
  stopTimeEntry,
  formatDuration,
} from "./api/clickup";

export default async function StopTimer() {
  try {
    const currentTimer = await getCurrentTimeEntry();

    if (!currentTimer) {
      await showToast({
        style: Toast.Style.Animated,
        title: "No Timer Running",
        message: "There is no active time tracker to stop",
      });
      return;
    }

    const stoppedEntry = await stopTimeEntry();
    const duration = formatDuration(parseInt(stoppedEntry.duration));
    const taskName = stoppedEntry.task?.name || "Unknown Task";

    await showToast({
      style: Toast.Style.Success,
      title: "Timer Stopped",
      message: `${taskName} - ${duration}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Stop Timer",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
