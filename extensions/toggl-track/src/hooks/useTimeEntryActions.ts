import { showToast, Toast, clearSearchBar, launchCommand, LaunchType } from "@raycast/api";

import { createTimeEntry, stopTimeEntry, TimeEntry } from "@/api";

/** Re-launch the menu bar command so it picks up the fresh cache. */
function refreshMenuBar() {
  launchCommand({ name: "menuBar", type: LaunchType.Background }).catch(() => {
    // Menu bar command may be disabled — safe to ignore
  });
}

export function useTimeEntryActions(revalidateRunningTimeEntry: () => void, revalidateTimeEntries: () => void) {
  async function resumeTimeEntry(timeEntry: TimeEntry) {
    await showToast(Toast.Style.Animated, "Starting timer...");
    try {
      await createTimeEntry({
        projectId: timeEntry.project_id ?? undefined,
        workspaceId: timeEntry.workspace_id,
        description: timeEntry.description,
        tags: timeEntry.tags,
        billable: timeEntry.billable,
      });
      revalidateRunningTimeEntry();
      refreshMenuBar();
      await showToast(Toast.Style.Success, "Time entry resumed");
      await clearSearchBar({ forceScrollToTop: true });
    } catch {
      await showToast(Toast.Style.Failure, "Failed to resume time entry");
    }
  }

  async function stopRunningTimeEntry(entry: TimeEntry) {
    await showToast(Toast.Style.Animated, "Stopping time entry...");
    try {
      await stopTimeEntry({ id: entry.id, workspaceId: entry.workspace_id });
      await showToast(Toast.Style.Success, `Stopped time entry`);
      revalidateRunningTimeEntry();
      revalidateTimeEntries();
      refreshMenuBar();
    } catch {
      await showToast(Toast.Style.Failure, "Failed to stop time entry");
    }
  }

  return { resumeTimeEntry, stopRunningTimeEntry };
}
