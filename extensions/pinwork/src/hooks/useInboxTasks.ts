/**
 * Hook to fetch inbox tasks with caching.
 */

import { useCachedPromise } from "@raycast/utils";
import { getInboxTasks } from "../api/pinwork";
import { shouldShowCompletedTasks } from "../utils/preferences";

export function useInboxTasks(options?: { execute?: boolean }) {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    getInboxTasks,
    [],
    {
      initialData: [],
      keepPreviousData: true,
      execute: options?.execute ?? true,
    },
  );

  const showCompleted = shouldShowCompletedTasks();
  const tasks = showCompleted ? data : data.filter((task) => !task.isCompleted);

  return { tasks, allTasks: data, isLoading, error, revalidate, mutate };
}
