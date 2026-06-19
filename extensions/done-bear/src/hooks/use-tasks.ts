import { useCachedPromise } from "@raycast/utils";

import { paginateGraphql } from "../api/client";
import { TASKS_ALL_QUERY, TASKS_QUERY } from "../api/queries";
import type { TaskRecord, TaskView } from "../api/types";
import { matchesView } from "../helpers/task-helpers";
import { ALL_WORKSPACES_ID, resolveAllScope } from "./use-workspaces";

const deduplicateById = (items: TaskRecord[]): TaskRecord[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

export const useTasks = (workspaceId: string | null, view?: TaskView, allWorkspaceIds?: string[]) => {
  const { isAll, cacheKey } = resolveAllScope(workspaceId, allWorkspaceIds);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (key: string) => {
      if (isAll) {
        return paginateGraphql<TaskRecord>({
          nodeKey: "tasks",
          query: TASKS_ALL_QUERY,
          variables: { workspaceIds: allWorkspaceIds },
        });
      }
      return paginateGraphql<TaskRecord>({
        nodeKey: "tasks",
        query: TASKS_QUERY,
        variables: { workspaceId: key },
      });
    },
    [cacheKey],
    { execute: !!workspaceId && (isAll || workspaceId !== ALL_WORKSPACES_ID) },
  );

  // Deduplicate by ID — pagination or multi-workspace queries can return dupes
  const unique = data ? deduplicateById(data) : [];

  let tasks: TaskRecord[];
  if (unique.length === 0) {
    tasks = [];
  } else if (view) {
    tasks = unique.filter((task) => matchesView(task, view));
  } else {
    tasks = unique.filter((task) => task.completedAt === null && task.archivedAt === null);
  }

  return { error, isLoading, revalidate, tasks };
};
