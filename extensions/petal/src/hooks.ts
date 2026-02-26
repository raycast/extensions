import { useCachedPromise } from "@raycast/utils";
import { loadHistoryRecords } from "./history";

export function useHistoryRecords() {
  const {
    data: records,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      return loadHistoryRecords();
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    records: records ?? [],
    isLoading,
    error,
    revalidate,
  };
}
