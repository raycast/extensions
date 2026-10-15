import { useCachedPromise } from "@raycast/utils";
import { getWorkItem } from "../api/work-items";
import { getWorkItemComments } from "../api/comments";
import { getWorkItemCycleAndModules } from "../api/activities";
import { errorShownInline } from "../helpers/errors";

export function useWorkItemDetail(workItemId: string, projectId: string) {
  return useCachedPromise(getWorkItem, [workItemId, projectId], {
    keepPreviousData: true,
    onError: errorShownInline,
  });
}

export function useWorkItemComments(workItemId: string, projectId: string, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    (workItemId: string, projectId: string) => getWorkItemComments({ projectId, workItemId }),
    [workItemId, projectId],
    { execute: config.execute !== false && !!workItemId && !!projectId, keepPreviousData: true },
  );
}

export function useWorkItemCycleAndModules(workItemId: string, projectId: string, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    (workItemId: string, projectId: string) => getWorkItemCycleAndModules({ projectId, workItemId }),
    [workItemId, projectId],
    { execute: config.execute !== false && !!workItemId && !!projectId, keepPreviousData: true },
  );
}
