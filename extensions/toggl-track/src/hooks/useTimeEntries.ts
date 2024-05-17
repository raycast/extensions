import dayjs from "dayjs";
import { useRef } from "react";

import { getMyTimeEntries } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useTimeEntries() {
  const startDateRef = useRef(dayjs().subtract(1, "week").toDate());
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(
    () => getMyTimeEntries({ startDate: startDateRef.current, endDate: dayjs().toDate(), includeMetadata: true }),
    [],
    { initialData: [] },
  );
  return {
    timeEntries: data,
    timeEntriesError: error,
    isLoadingTimeEntries: isLoading,
    revalidateTimeEntries: revalidate,
  };
}
