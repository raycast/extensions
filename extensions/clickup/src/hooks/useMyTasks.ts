import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpTask } from "../types/clickup";
import { getMissingParentIds } from "../utils/task-helpers";

export type MyTasksScope = "list" | "workspace";

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
 * Hook to fetch tasks assigned to the authenticated user, in the Default List or the whole Workspace
 * Also fetches parent tasks for context, even if not assigned, unless only tasks with a due date are shown
 */
export function useMyTasks(scope: MyTasksScope, dueDateOnly: boolean): UseMyTasksResult {
  const { listId, teamId } = getPreferenceValues<Preferences>();

  const fetchMyTasks = async (scope: MyTasksScope, dueDateOnly: boolean): Promise<FetchMyTasksResult> => {
    const client = getClickUpClient();
    const user = await client.getAuthenticatedUser();

    const params = {
      assignees: [user.id],
      // due_date_gt=0 matches any due date, including overdue ones
      due_date_gt: dueDateOnly ? 0 : undefined,
    };
    let fetchedTasks: ClickUpTask[];
    if (scope === "workspace") {
      if (!teamId) {
        throw new Error("Set the Default Team ID (your Workspace ID) in the extension preferences to use this scope.");
      }
      fetchedTasks = await client.getAllTasksFromWorkspace(teamId, { ...params, subtasks: true });
    } else {
      fetchedTasks = await client.getAllTasksFromListRecursively(listId, { ...params, archived: false });
    }
    const assignedTasks = dueDateOnly ? fetchedTasks.filter((t) => t.due_date !== null) : fetchedTasks;
    const assignedTaskIds = new Set(assignedTasks.map((t) => t.id));

    if (dueDateOnly) {
      return { assignedTaskIds: Array.from(assignedTaskIds), tasks: assignedTasks, userName: user.username };
    }

    const missingParentIds = getMissingParentIds(assignedTasks);

    const parentTasks: ClickUpTask[] = [];
    const fetchedParentIds = new Set<string>();
    const MAX_PARENT_DEPTH = 10;

    for (const parentId of missingParentIds) {
      if (fetchedParentIds.has(parentId)) continue;

      try {
        const parentTask = await client.getTask(parentId);
        parentTasks.push(parentTask);
        fetchedParentIds.add(parentId);

        let currentParent = parentTask;
        let depth = 0;
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

  const { data, error, isLoading } = useCachedPromise(fetchMyTasks, [scope, dueDateOnly], {
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
