import { useCachedPromise } from "@raycast/utils";
import type { PaginationOptions } from "@raycast/utils/dist/types";

import { getProjects, type ProjectResult } from "../api/getProjects";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useProjects(
  teamId?: string,
  config?: { execute?: boolean; searchText?: string; pageSize?: number },
) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (key: string, teamId?: string, searchText?: string) => (pagination: PaginationOptions<ProjectResult[]>) =>
      getProjects({
        teamId,
        searchText,
        after: pagination.cursor,
        first: config?.pageSize,
      }),
    [workspaceKey, teamId, config?.searchText],
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
