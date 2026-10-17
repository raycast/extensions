import { useCachedPromise } from "@raycast/utils";
import { getModules } from "../api/modules";
import { PaginationOptions } from "@raycast/utils/dist/types";

export function useModules(projectId: string, config: { execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => (pagination: PaginationOptions) => getModules({ projectId, cursor: pagination.cursor }),
    [projectId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: config.execute !== false,
    },
  );

  return {
    modules: data,
    error,
    isLoading,
    mutate,
    pagination,
  };
}
