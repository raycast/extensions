import { useCachedPromise, UseCachedPromiseReturnType } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { ClickUpTask, GetTasksParams } from "../types/clickup";
import { sortTasksHierarchically } from "../utils/task-helpers";

interface UseTasksOptions {
  params?: Omit<GetTasksParams, "page">;
  sortHierarchically?: boolean;
}

type UseTasksResult = Pick<UseCachedPromiseReturnType<ClickUpTask[], never[]>, "error" | "isLoading"> & {
  tasks: ClickUpTask[];
};

export function useTasks({ params, sortHierarchically = true }: UseTasksOptions = {}): UseTasksResult {
  const fetchTasks = async () => {
    const client = getClickUpClient();
    const fetchedTasks = await client.getAllTasks({ archived: false, subtasks: true, ...params });
    return sortHierarchically ? sortTasksHierarchically(fetchedTasks) : fetchedTasks;
  };

  const { data, error, isLoading } = useCachedPromise(fetchTasks, [], { initialData: [] });

  return { error, isLoading, tasks: data || [] };
}
