/**
 * Hook to fetch today's tasks with caching.
 */

import { useCachedPromise } from "@raycast/utils";
import { getTodayTasks } from "../api/pinwork";
import { shouldShowCompletedTasks } from "../utils/preferences";

export function useTodayTasks(options?: { execute?: boolean }) {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    getTodayTasks,
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
