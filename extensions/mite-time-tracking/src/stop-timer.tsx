import { showToast, Toast, showHUD } from "@raycast/api";
import {
  getTracker,
  stopTracker,
  isTrackerRunning,
  getRunningEntryId,
} from "./api/tracker";
import { getTimeEntry } from "./api/time-entries";
import { formatMinutesToHours } from "./utils/validation";

export default async function StopCurrent() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking Running Timer...",
    });

    const tracker = await getTracker();

    if (!isTrackerRunning(tracker)) {
      await showHUD("No Timer Running");
      return;
    }

    const entryId = getRunningEntryId(tracker);
    if (!entryId) {
      await showHUD("No Timer Running");
      return;
    }

    // Get entry details before stopping
    const entry = await getTimeEntry(entryId);

    // Stop the tracker
    const stoppedTracker = await stopTracker(entryId);

    const minutes = stoppedTracker.stopped_time_entry?.minutes || 0;
    const duration = formatMinutesToHours(minutes);

    const projectInfo = entry.project_name
      ? `${entry.customer_name} - ${entry.project_name}`
      : "Project";

    await showHUD(`Timer Stopped - ${duration} tracked\n${projectInfo}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Stop",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
