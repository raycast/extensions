import { useCachedPromise } from "@raycast/utils";
import { getStates } from "../api/states";
import { PaginationOptions } from "@raycast/utils/dist/types";

export function useStates(projectId: string, config: { execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => (pagination: PaginationOptions) => getStates({ projectId, cursor: pagination.cursor }),
    [projectId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: config.execute !== false,
    },
  );

  return {
    states: data,
    error,
    isLoading,
    mutate,
    pagination,
  };
}
