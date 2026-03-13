import { getRunningTimeEntry } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useRunningTimeEntry() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getRunningTimeEntry, [], { initialData: null });
  return {
    runningTimeEntry: data,
    runningTimeEntryError: error,
    isLoadingRunningTimeEntry: isLoading,
    revalidateRunningTimeEntry: revalidate,
  };
}
