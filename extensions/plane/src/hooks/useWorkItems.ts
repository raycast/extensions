import { useCachedPromise } from "@raycast/utils";
import { searchWorkItems } from "../api/work-items";

export function useWorkItems(searchText: string, projectId?: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (searchText: string, projectId?: string) => searchWorkItems({ searchText, projectId }),
    [searchText, projectId],
  );
  return {
    workItems: data || [],
    error,
    isLoading,
    mutate,
  };
}
