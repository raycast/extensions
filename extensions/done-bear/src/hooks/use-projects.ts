import { useCachedPromise } from "@raycast/utils";

import { paginateGraphql } from "../api/client";
import { PROJECTS_ALL_QUERY, PROJECTS_QUERY } from "../api/queries";
import type { ProjectRecord } from "../api/types";
import { ALL_WORKSPACES_ID, resolveAllScope } from "./use-workspaces";

export const useProjects = (workspaceId: string | null, allWorkspaceIds?: string[]) => {
  const { isAll, cacheKey } = resolveAllScope(workspaceId, allWorkspaceIds);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (key: string) => {
      if (isAll) {
        return paginateGraphql<ProjectRecord>({
          nodeKey: "projects",
          query: PROJECTS_ALL_QUERY,
          variables: { workspaceIds: allWorkspaceIds },
        });
      }
      return paginateGraphql<ProjectRecord>({
        nodeKey: "projects",
        query: PROJECTS_QUERY,
        variables: { workspaceId: key },
      });
    },
    [cacheKey],
    { execute: !!workspaceId && (isAll || workspaceId !== ALL_WORKSPACES_ID) },
  );

  return { error, isLoading, projects: data || [], revalidate };
};
