import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyTasks } from "../api";

export function useTasks() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyTasks, [], { initialData: [] });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}
