import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpTask } from "../types/clickup";

type FetchTasksResult = ClickUpTask[];

type UseTasksResult = Pick<UseCachedPromiseReturnType<FetchTasksResult, never[]>, "error" | "isLoading"> & {
  tasks: ClickUpTask[];
};

interface UseTasksOptions {
  includeSubtasks?: boolean;
  listId: string;
}

/**
 * Hook to fetch tasks from a specific list with pagination
 */
export function useTasks({ includeSubtasks = true, listId }: UseTasksOptions): UseTasksResult {
  const { data, error, isLoading } = useCachedPromise(
    async (id: string, withSubtasks: boolean): Promise<FetchTasksResult> => {
      const client = getClickUpClient();

      if (withSubtasks) {
        return client.getAllTasksFromListRecursively(id, { archived: false });
      }

      return client.getAllTasksFromList(id, { archived: false });
    },
    [listId, includeSubtasks],
    { initialData: [] },
  );

  return {
    error,
    isLoading,
    tasks: data || [],
  };
}
