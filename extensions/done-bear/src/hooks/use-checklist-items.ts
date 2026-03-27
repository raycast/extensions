import { useCachedPromise } from "@raycast/utils";

import { paginateGraphql } from "../api/client";
import { CHECKLIST_ITEMS_QUERY } from "../api/queries";
import type { ChecklistItemRecord } from "../api/types";

export const useChecklistItems = (taskId: string | null) => {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (tId: string) =>
      paginateGraphql<ChecklistItemRecord>({
        nodeKey: "taskChecklistItems",
        query: CHECKLIST_ITEMS_QUERY,
        variables: { taskId: tId },
      }),
    [taskId || ""],
    { execute: !!taskId },
  );

  return { checklistItems: data || [], error, isLoading, revalidate };
};
