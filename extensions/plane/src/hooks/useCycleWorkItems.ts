import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { getActiveCycles, getCycleWorkItems } from "../api/cycles";
import { getModuleWorkItems } from "../api/modules";
import { WorkItemSummary } from "../api/types";
import { planeClient } from "../api/auth";
import { errorShownInline } from "../helpers/errors";

type ProjectRef = { id: string; identifier: string; name?: string };

export function useActiveCycles() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
  return useCachedPromise((_workspaceSlug?: string) => getActiveCycles(), [planeClient?.workspaceSlug], {
    keepPreviousData: true,
    onError: errorShownInline,
  });
}

export function useCycleWorkItems(project: ProjectRef, cycleId: string) {
  return useCachedPromise(
    (projectId: string, identifier: string, cycleId: string) =>
      async (pagination: PaginationOptions<WorkItemSummary[]>) =>
        getCycleWorkItems({
          project: { id: projectId, identifier, name: project.name },
          cycleId,
          cursor: pagination.cursor,
        }),
    [project.id, project.identifier, cycleId],
    { keepPreviousData: true, onError: errorShownInline },
  );
}

export function useModuleWorkItems(project: ProjectRef, moduleId: string) {
  return useCachedPromise(
    (projectId: string, identifier: string, moduleId: string) =>
      async (pagination: PaginationOptions<WorkItemSummary[]>) =>
        getModuleWorkItems({
          project: { id: projectId, identifier, name: project.name },
          moduleId,
          cursor: pagination.cursor,
        }),
    [project.id, project.identifier, moduleId],
    { keepPreviousData: true, onError: errorShownInline },
  );
}
