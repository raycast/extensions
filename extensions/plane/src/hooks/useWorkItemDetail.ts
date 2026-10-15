import { useCachedPromise } from "@raycast/utils";
import { getWorkItem } from "../api/work-items";
import { getWorkItemComments } from "../api/comments";
import { getWorkItemCycleAndModules } from "../api/activities";
import { inlineErrorHandler } from "../helpers/errors";

/** `showsErrorInline`: the caller renders `error` (the detail view), so no toast. The edit form keeps the toast. */
export function useWorkItemDetail(workItemId: string, projectId: string, config: { showsErrorInline?: boolean } = {}) {
  return useCachedPromise(getWorkItem, [workItemId, projectId], {
    keepPreviousData: true,
    onError: inlineErrorHandler(config.showsErrorInline),
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
