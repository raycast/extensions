import { useMemo } from "react";

import { useTimeEntries, useRunningTimeEntry } from "@/hooks";

export function useProcessedTimeEntries() {
  const { timeEntries, isLoadingTimeEntries, revalidateTimeEntries, mutateTimeEntries } = useTimeEntries();
  const { runningTimeEntry, isLoadingRunningTimeEntry, revalidateRunningTimeEntry } = useRunningTimeEntry();

  const isLoading = isLoadingTimeEntries || isLoadingRunningTimeEntry;

  const timeEntriesWithUniqueProjectAndDescription = useMemo(() => {
    const seenEntries = new Set();
    const result = [];

    for (const timeEntry of timeEntries) {
      const uniqueKey = `${timeEntry.project_id}-${timeEntry.description}`;

      if (
        (timeEntry.description === runningTimeEntry?.description &&
          timeEntry.project_id === runningTimeEntry?.project_id) ||
        seenEntries.has(uniqueKey)
      ) {
        continue;
      }

      seenEntries.add(uniqueKey);
      result.push(timeEntry);
    }

    return result;
  }, [timeEntries, runningTimeEntry]);

  const runningTimeEntryMetadata = timeEntries.find(
    (entry) => entry.description === runningTimeEntry?.description && entry.project_id === runningTimeEntry.project_id,
  );

  const runningTimeWithUniqueProjectAndDescription =
    runningTimeEntryMetadata && runningTimeEntry ? { ...runningTimeEntryMetadata, ...runningTimeEntry } : undefined;

  return {
    isLoading,
    mutateTimeEntries,
    revalidateRunningTimeEntry,
    revalidateTimeEntries,
    runningTimeEntry: runningTimeWithUniqueProjectAndDescription,
    timeEntries,
    timeEntriesWithUniqueProjectAndDescription,
  };
}
