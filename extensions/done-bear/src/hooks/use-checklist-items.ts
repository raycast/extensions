import { useCachedPromise } from "@raycast/utils";
import { paginateGraphql } from "../api/client";
import { CHECKLIST_ITEMS_QUERY } from "../api/queries";
import type { ChecklistItemRecord } from "../api/types";

export function useChecklistItems(taskId: string | null) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (tId: string) =>
      paginateGraphql<ChecklistItemRecord>({
        query: CHECKLIST_ITEMS_QUERY,
        variables: { taskId: tId },
        nodeKey: "taskChecklistItems",
      }),
    [taskId || ""],
    { execute: !!taskId },
  );

  return { checklistItems: data || [], isLoading, error, revalidate };
}
