import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getRunningTimeEntry } from "../api";

export function useRunningTimeEntry() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getRunningTimeEntry, [], { initialData: null });
  return {
    runningTimeEntry: data,
    runningTimeEntryError: error,
    isLoadingRunningTimeEntry: isLoading,
    revalidateRunningTimeEntry: revalidate,
  };
}
