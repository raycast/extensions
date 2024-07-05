import { showToast, Toast, clearSearchBar } from "@raycast/api";

import { createTimeEntry, stopTimeEntry, TimeEntry } from "@/api";

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
      await showToast(Toast.Style.Success, "Time entry resumed");
      await clearSearchBar({ forceScrollToTop: true });
    } catch (e) {
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
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to stop time entry");
    }
  }

  return { resumeTimeEntry, stopRunningTimeEntry };
}
