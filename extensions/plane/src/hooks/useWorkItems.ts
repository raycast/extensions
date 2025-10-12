import { useCachedPromise } from "@raycast/utils";
import { searchWorkItems } from "../api/work-items";

export function useWorkItems(searchText: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (searchText: string) => searchWorkItems({ searchText }),
    [searchText],
  );
  return {
    workItems: data || [],
    error,
    isLoading,
    mutate,
  };
}
