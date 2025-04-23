import dayjs from "dayjs";
import { useRef } from "react";

import { getMyTimeEntries } from "@/api";
import { timeEntriesLookbackDays } from "@/helpers/preferences";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useTimeEntries() {
  // Use timeEntriesLookbackDays with default of 14 days, limited to 60 days maximum
  const lookbackDays = Math.min(Number(timeEntriesLookbackDays) || 14, 60);

  const startDateRef = useRef(dayjs().subtract(lookbackDays, "day").toDate());
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
