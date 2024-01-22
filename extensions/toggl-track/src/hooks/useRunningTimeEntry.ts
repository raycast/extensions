import { useCachedPromise } from "@raycast/utils";
import { getRunningTimeEntry } from "../api";

export function useRunningTimeEntry(initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getRunningTimeEntry, [], {
    initialData: null,
    execute: initialExecute,
  });
  return {
    runningTimeEntry: data,
    runningTimeEntryError: error,
    isLoadingRunningTimeEntry: isLoading,
    revalidateRunningTimeEntry: revalidate,
  };
}
