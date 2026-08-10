import { useCachedPromise } from "@raycast/utils";
import { getWorkItem } from "../api/work-items";

export function useWorkItemDetail(workItemId: string, projectId: string) {
  return useCachedPromise(getWorkItem, [workItemId, projectId]);
}
