import { useCachedPromise } from "@raycast/utils";
import { paginateGraphql } from "../api/client";
import { PROJECTS_ALL_QUERY, PROJECTS_QUERY } from "../api/queries";
import type { ProjectRecord } from "../api/types";
import { ALL_WORKSPACES_ID, resolveAllScope } from "./use-workspaces";

export function useProjects(workspaceId: string | null, allWorkspaceIds?: string[]) {
  const { isAll, cacheKey } = resolveAllScope(workspaceId, allWorkspaceIds);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (key: string) => {
      if (isAll) {
        return paginateGraphql<ProjectRecord>({
          query: PROJECTS_ALL_QUERY,
          variables: { workspaceIds: allWorkspaceIds },
          nodeKey: "projects",
        });
      }
      return paginateGraphql<ProjectRecord>({
        query: PROJECTS_QUERY,
        variables: { workspaceId: key },
        nodeKey: "projects",
      });
    },
    [cacheKey],
    { execute: !!workspaceId && (isAll || workspaceId !== ALL_WORKSPACES_ID) },
  );

  return { projects: data || [], isLoading, error, revalidate };
}
