import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { getClickUpClient } from "../api/clickup";
import type { ClickUpTask } from "../types/clickup";
import { getMissingParentIds } from "../utils/task-helpers";

interface FetchMyTasksResult {
  assignedTaskIds: string[];
  tasks: ClickUpTask[];
  userName: string;
}

type UseMyTasksResult = Pick<UseCachedPromiseReturnType<FetchMyTasksResult, never[]>, "error" | "isLoading"> & {
  assignedTaskIds: Set<string>;
  tasks: ClickUpTask[];
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
  userName: string;
};

/**
 * Hook to fetch tasks assigned to the authenticated user
 * Also fetches parent tasks for context, even if not assigned
 */
export function useMyTasks(): UseMyTasksResult {
  const fetchMyTasks = async (): Promise<FetchMyTasksResult> => {
    const client = getClickUpClient();
    const listId = client.getDefaultListId();
    const user = await client.getAuthenticatedUser();

    const assignedTasks = await client.getAllTasksRecursively(listId, {
      archived: false,
      assignees: [user.id],
    });
    const assignedTaskIds = new Set(assignedTasks.map((t) => t.id));

    const missingParentIds = getMissingParentIds(assignedTasks);

    const parentTasks: ClickUpTask[] = [];
    const fetchedParentIds = new Set<string>();

    for (const parentId of missingParentIds) {
      if (fetchedParentIds.has(parentId)) continue;

      try {
        const parentTask = await client.getTask(parentId);
        parentTasks.push(parentTask);
        fetchedParentIds.add(parentId);

        let currentParent = parentTask;
        let depth = 0;
        const MAX_PARENT_DEPTH = 10;
        while (
          currentParent.parent &&
          !assignedTaskIds.has(currentParent.parent) &&
          !fetchedParentIds.has(currentParent.parent) &&
          depth < MAX_PARENT_DEPTH
        ) {
          const grandparent = await client.getTask(currentParent.parent);
          parentTasks.push(grandparent);
          fetchedParentIds.add(grandparent.id);
          currentParent = grandparent;
          depth++;
        }
      } catch (error) {
        console.error(`Failed to fetch parent task ${parentId}:`, error);
      }
    }

    const allTasks = [...assignedTasks, ...parentTasks];

    return { assignedTaskIds: Array.from(assignedTaskIds), tasks: allTasks, userName: user.username };
  };

  const { data, error, isLoading, mutate } = useCachedPromise(fetchMyTasks, [], {
    initialData: { assignedTaskIds: [], tasks: [], userName: "" } as FetchMyTasksResult,
  });

  const updateTaskStatus = async (taskId: string, newStatus: string): Promise<void> => {
    const client = getClickUpClient();

    try {
      await mutate(client.updateTask(taskId, { status: newStatus }), {
        optimisticUpdate(data) {
          if (!data) return data;
          return {
            ...data,
            tasks: data.tasks.map((task) =>
              task.id === taskId ? { ...task, status: { ...task.status, status: newStatus } } : task,
            ),
          };
        },
        shouldRevalidateAfter: false,
      });

      await showToast({
        message: `Changed to ${newStatus}`,
        style: Toast.Style.Success,
        title: "Status Updated",
      });
    } catch (err) {
      await showToast({
        message: err instanceof Error ? err.message : String(err),
        style: Toast.Style.Failure,
        title: "Failed to Update Status",
      });
    }
  };

  return {
    assignedTaskIds: new Set(data?.assignedTaskIds || []),
    error,
    isLoading,
    tasks: data?.tasks || [],
    updateTaskStatus,
    userName: data?.userName || "",
  };
}
