import { useCachedPromise } from "@raycast/utils";
import { getRunningTimeEntry } from "../api";

export function useRunningTimeEntry() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getRunningTimeEntry, [], {
    initialData: null,
  });
  return {
    runningTimeEntry: data,
    runningTimeEntryError: error,
    isLoadingRunningTimeEntry: isLoading,
    revalidateRunningTimeEntry: revalidate,
  };
}
