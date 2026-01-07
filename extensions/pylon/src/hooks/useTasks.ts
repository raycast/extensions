import { useCachedPromise } from "@raycast/utils";
import { getTasks, getTasksByAssignee, getTasksByAccount } from "../api";

export function useTasks(filters?: Record<string, unknown>) {
  return useCachedPromise(getTasks, [filters], {
    keepPreviousData: true,
  });
}

export function useMyTasks(userId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return [];
      return getTasksByAssignee(id);
    },
    [userId || ""],
    {
      keepPreviousData: true,
      execute: !!userId,
    },
  );
}

export function useTasksByAccount(accountId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return [];
      return getTasksByAccount(id);
    },
    [accountId || ""],
    {
      keepPreviousData: true,
      execute: !!accountId,
    },
  );
}
