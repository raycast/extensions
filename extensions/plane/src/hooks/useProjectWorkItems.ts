import { useCachedPromise } from "@raycast/utils";
import { getProjectWorkItems } from "../api/work-items";

export function useProjectWorkItems(projectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (projectId: string) => getProjectWorkItems(projectId),
    [projectId],
  );
  return {
    workItems: data || [],
    error,
    isLoading,
    mutate,
  };
}
