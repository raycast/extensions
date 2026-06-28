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
    (entry) => entry.description === runningTimeEntry?.description && entry.project_id === runningTimeEntry?.project_id,
  );

  // When a timer is just created it won't be in timeEntries yet, so runningTimeEntryMetadata
  // may be undefined. Spreading undefined is a safe no-op — the entry renders without metadata.
  const runningTimeWithUniqueProjectAndDescription = runningTimeEntry
    ? { ...runningTimeEntryMetadata, ...runningTimeEntry }
    : undefined;

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
