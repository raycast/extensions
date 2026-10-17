import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { getProjectWorkItems } from "../api/work-items";
import { WorkItemSummary } from "../api/types";
import { errorShownInline } from "../helpers/errors";

export function useProjectWorkItems(project: { id: string; identifier: string; name?: string }) {
  const { data, error, isLoading, mutate, pagination, revalidate } = useCachedPromise(
    (projectId: string, identifier: string, name?: string) =>
      async (pagination: PaginationOptions<WorkItemSummary[]>) =>
        getProjectWorkItems({ project: { id: projectId, identifier, name }, cursor: pagination.cursor }),
    [project.id, project.identifier, project.name],
    { keepPreviousData: true, onError: errorShownInline },
  );
  return {
    workItems: data || [],
    error,
    isLoading,
    mutate,
    pagination,
    revalidate,
  };
}
