import { useRef } from "react";
import { useSafeCachedPromise } from "./useSafeCachedPromise";
import dayjs from "dayjs";
import { getMyTimeEntries } from "../api";

export function useTimeEntries() {
  const startDateRef = useRef(dayjs().subtract(1, "week").toDate());
  const endDateRef = useRef(dayjs().toDate());
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(
    () => getMyTimeEntries({ startDate: startDateRef.current, endDate: endDateRef.current, includeMetadata: true }),
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
