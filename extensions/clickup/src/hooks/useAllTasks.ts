import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { getClickUpClient } from "../api/clickup";
import type { ClickUpTask, GetTasksParams } from "../types/clickup";
import { sortTasksHierarchically } from "../utils/task-helpers";

interface UseAllTasksOptions {
  params?: Omit<GetTasksParams, "page">;
  sortHierarchically?: boolean;
}

type UseAllTasksResult = Pick<UseCachedPromiseReturnType<ClickUpTask[], never[]>, "error" | "isLoading"> & {
  tasks: ClickUpTask[];
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
};

/**
 * Hook to fetch all tasks from the default list with pagination and subtasks
 */
export function useAllTasks({ params, sortHierarchically = true }: UseAllTasksOptions = {}): UseAllTasksResult {
  const fetchTasks = async () => {
    const client = getClickUpClient();
    const listId = client.getDefaultListId();
    const fetchedTasks = await client.getAllTasksRecursively(listId, { archived: false, ...params });
    return sortHierarchically ? sortTasksHierarchically(fetchedTasks) : fetchedTasks;
  };

  const { data, error, isLoading, mutate } = useCachedPromise(fetchTasks, [], {
    initialData: [] as ClickUpTask[],
  });

  const updateTaskStatus = async (taskId: string, newStatus: string): Promise<void> => {
    const client = getClickUpClient();

    try {
      await mutate(client.updateTask(taskId, { status: newStatus }), {
        optimisticUpdate(data) {
          if (!data) return data;
          return data.map((task) =>
            task.id === taskId ? { ...task, status: { ...task.status, status: newStatus } } : task,
          );
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

  return { error, isLoading, tasks: data || [], updateTaskStatus };
}
