import { useCachedPromise } from "@raycast/utils";
import { getLabels } from "../api/labels";
import { PaginationOptions } from "@raycast/utils/dist/types";

export function useLabels(projectId: string, config: { execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => (pagination: PaginationOptions) => getLabels({ projectId, cursor: pagination.cursor }),
    [projectId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: config.execute !== false,
    },
  );

  return {
    labels: data,
    error,
    isLoading,
    mutate,
    pagination,
  };
}
