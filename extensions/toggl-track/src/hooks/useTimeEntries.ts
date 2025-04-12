import dayjs from "dayjs";
import { useRef } from "react";

import { getMyTimeEntries } from "@/api";
import { timeEntriesLookbackNumber, timeEntriesLookbackUnit } from "@/helpers/preferences";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useTimeEntries() {
  const lookbackNumber = timeEntriesLookbackNumber || 2;
  const lookbackUnit = timeEntriesLookbackUnit || "week";

  const startDateRef = useRef(dayjs().subtract(lookbackNumber, lookbackUnit).toDate());
  const { data, error, isLoading, revalidate, mutate } = useSafeCachedPromise(
    () => getMyTimeEntries({ startDate: startDateRef.current, endDate: dayjs().toDate(), includeMetadata: true }),
    [],
    { initialData: [] },
  );
  return {
    timeEntries: data,
    timeEntriesError: error,
    isLoadingTimeEntries: isLoading,
    revalidateTimeEntries: revalidate,
    mutateTimeEntries: mutate,
  };
}
