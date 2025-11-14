import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpTask } from "../types/clickup";

type FetchMyTasksResult = {
  tasks: ClickUpTask[];
  userName: string;
};

type UseMyTasksResult = Pick<UseCachedPromiseReturnType<FetchMyTasksResult, never[]>, "error" | "isLoading"> & {
  tasks: ClickUpTask[];
  userName: string;
};

/**
 * Hook to fetch tasks assigned to the authenticated user
 */
export function useMyTasks(): UseMyTasksResult {
  const fetchMyTasks = async (): Promise<FetchMyTasksResult> => {
    const client = getClickUpClient();
    const user = await client.getAuthenticatedUser();
    const tasks = await client.getTasks({ archived: false, assignees: [user.id], subtasks: true });
    return { tasks, userName: user.username };
  };

  const { data, error, isLoading } = useCachedPromise(fetchMyTasks, [], {
    initialData: { tasks: [], userName: "" },
  });

  return { error, isLoading, tasks: data?.tasks || [], userName: data?.userName || "" };
}
