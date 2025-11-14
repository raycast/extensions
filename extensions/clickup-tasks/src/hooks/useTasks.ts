import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
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
    const fetchedTasks = await client.getAllTasksRecursively({ archived: false, ...params });
    return sortHierarchically ? sortTasksHierarchically(fetchedTasks) : fetchedTasks;
  };

  const { data, error, isLoading } = useCachedPromise(fetchTasks, [], { initialData: [] });

  return { error, isLoading, tasks: data || [] };
}
