import { useCachedPromise } from "@raycast/utils";
import { getCycles } from "../api/cycles";
import { PaginationOptions } from "@raycast/utils/dist/types";

export function useCycles(projectId: string, config: { execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (projectId: string) => (pagination: PaginationOptions) => getCycles({ projectId, cursor: pagination.cursor }),
    [projectId],
    {
      initialData: [],
      keepPreviousData: true,
      execute: config.execute !== false,
    },
  );

  const filteredCycles = data.filter((cycle) => cycle.endDate && new Date(cycle.endDate) > new Date());
  return {
    cycles: filteredCycles,
    error,
    isLoading,
    mutate,
    pagination,
  };
}
