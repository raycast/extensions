import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpTask } from "../types/clickup";
import { getMissingParentIds } from "../utils/task-helpers";

type FetchMyTasksResult = {
  assignedTaskIds: string[];
  tasks: ClickUpTask[];
  userName: string;
};

type UseMyTasksResult = Pick<UseCachedPromiseReturnType<FetchMyTasksResult, never[]>, "error" | "isLoading"> & {
  assignedTaskIds: Set<string>;
  tasks: ClickUpTask[];
  userName: string;
};

/**
 * Hook to fetch tasks assigned to the authenticated user
 * Also fetches parent tasks for context, even if not assigned
 */
export function useMyTasks(): UseMyTasksResult {
  const fetchMyTasks = async (): Promise<FetchMyTasksResult> => {
    const client = getClickUpClient();
    const user = await client.getAuthenticatedUser();

    // Get tasks assigned to the user
    const assignedTasks = await client.getAllTasksRecursively({ archived: false, assignees: [user.id] });
    const assignedTaskIds = new Set(assignedTasks.map((t) => t.id));

    // Find missing parent tasks
    const missingParentIds = getMissingParentIds(assignedTasks);

    // Fetch missing parent tasks (and their parents recursively)
    const parentTasks: ClickUpTask[] = [];
    const fetchedParentIds = new Set<string>();

    for (const parentId of missingParentIds) {
      if (fetchedParentIds.has(parentId)) continue;

      try {
        const parentTask = await client.getTask(parentId);
        parentTasks.push(parentTask);
        fetchedParentIds.add(parentId);

        // Check if this parent also has a parent we need to fetch
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

    // Combine assigned tasks and parent tasks
    const allTasks = [...assignedTasks, ...parentTasks];

    return { assignedTaskIds: Array.from(assignedTaskIds), tasks: allTasks, userName: user.username };
  };

  const { data, error, isLoading } = useCachedPromise(fetchMyTasks, [], {
    initialData: { assignedTaskIds: [], tasks: [], userName: "" },
  });

  return {
    assignedTaskIds: new Set(data?.assignedTaskIds || []),
    error,
    isLoading,
    tasks: data?.tasks || [],
    userName: data?.userName || "",
  };
}
