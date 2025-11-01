import { useCachedPromise } from "@raycast/utils";
import type { PaginationOptions } from "@raycast/utils/dist/types";

import { getProjects, type ProjectResult } from "../api/getProjects";

export default function useProjects(
  teamId?: string,
  config?: { execute?: boolean; searchText?: string; pageSize?: number },
) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (teamId?: string, searchText?: string) => (pagination: PaginationOptions<ProjectResult[]>) =>
      getProjects({
        teamId,
        searchText,
        after: pagination.cursor,
        first: config?.pageSize,
      }),
    [teamId, config?.searchText],
    {
      execute: config?.execute !== false,
      keepPreviousData: true,
    },
  );

  return {
    projects: data,
    isLoadingProjects: (!data && !error) || isLoading,
    projectsError: error,
    mutateProjects: mutate,
    pagination,
  };
}
