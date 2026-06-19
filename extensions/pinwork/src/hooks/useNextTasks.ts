/**
 * Hook to fetch upcoming tasks (next 14 days).
 */

import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getAllTasks } from "../api/pinwork";
import { addDays, startOfDay } from "date-fns";
import { shouldShowCompletedTasks } from "../utils/preferences";

export function useNextTasks(options?: { execute?: boolean }) {
  const abortable = useRef<AbortController | null>(null);

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    getAllTasks,
    [],
    {
      initialData: [],
      keepPreviousData: true,
      execute: options?.execute ?? true,
      abortable,
    },
  );

  const showCompleted = shouldShowCompletedTasks();
  const now = new Date();
  const today = startOfDay(now);
  const twoWeeksLater = addDays(today, 14);

  const tasks = data
    .filter((task) => {
      if (!showCompleted && task.isCompleted) return false;
      if (!task.scheduledDate) return false;
      const taskDate = startOfDay(task.scheduledDate);
      return taskDate > today && taskDate <= twoWeeksLater;
    })
    .sort((a, b) => {
      const dateA = a.scheduledDate?.getTime() || 0;
      const dateB = b.scheduledDate?.getTime() || 0;
      return dateA - dateB;
    });

  return { tasks, isLoading, error, revalidate, mutate };
}
