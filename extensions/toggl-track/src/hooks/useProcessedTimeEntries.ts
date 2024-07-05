import { useMemo } from "react";

import { TimeEntry, TimeEntryMetaData } from "@/api";
import { useTimeEntries, useRunningTimeEntry } from "@/hooks";

export function useProcessedTimeEntries() {
  const { timeEntries, isLoadingTimeEntries, revalidateTimeEntries } = useTimeEntries();
  const { runningTimeEntry, isLoadingRunningTimeEntry, revalidateRunningTimeEntry } = useRunningTimeEntry();

  const isLoading = isLoadingTimeEntries || isLoadingRunningTimeEntry;

  const timeEntriesWithUniqueProjectAndDescription = useMemo(() => {
    return timeEntries.reduce<typeof timeEntries>((acc, timeEntry) => {
      if (
        timeEntry.id === runningTimeEntry?.id ||
        acc.find((t) => t.description === timeEntry.description && t.project_id === timeEntry.project_id)
      )
        return acc;
      return [...acc, timeEntry];
    }, []);
  }, [timeEntries, runningTimeEntry]);

  return {
    timeEntries,
    runningTimeEntry: runningTimeEntry as TimeEntry & TimeEntryMetaData,
    isLoading,
    revalidateTimeEntries,
    revalidateRunningTimeEntry,
    timeEntriesWithUniqueProjectAndDescription,
  };
}
