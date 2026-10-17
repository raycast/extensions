import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { getProjectWorkItems } from "../api/work-items";
import { Issue } from "@makeplane/plane-node-sdk";

export function useProjectWorkItems(projectId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => async (pagination: PaginationOptions<Issue[]>) =>
      getProjectWorkItems({ projectId, cursor: pagination.cursor }),
    [projectId],
  );
  return {
    workItems: data || [],
    error,
    isLoading,
    mutate,
    pagination,
  };
}
