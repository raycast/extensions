import { useCachedPromise } from "@raycast/utils";
import { getMyTasks } from "../api";

export function useTasks() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMyTasks, [], { initialData: [] });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}
