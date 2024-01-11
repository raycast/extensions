import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import dayjs from "dayjs";
import { getTimeEntries } from "../api";

export function useTimeEntries(initialExecute = true) {
  const startDateRef = useRef(dayjs().subtract(1, "week").toDate());
  const endDateRef = useRef(dayjs().toDate());
  const { data, error, isLoading, revalidate } = useCachedPromise(
    () => getTimeEntries({ startDate: startDateRef.current, endDate: endDateRef.current }),
    [],
    { initialData: [], execute: initialExecute },
  );
  return {
    timeEntries: data,
    timeEntriesError: error,
    isLoadingTimeEntries: isLoading,
    revalidateTimeEntries: revalidate,
  };
}
