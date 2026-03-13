import { getMyTasks } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useTasks() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyTasks, [], { initialData: [] });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}
