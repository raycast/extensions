import { useCachedPromise } from "@raycast/utils";
import { getProjectsByAccount, getMilestonesByProject } from "../api";

export function useProjects(accountId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return [];
      return getProjectsByAccount(id);
    },
    [accountId || ""],
    {
      keepPreviousData: true,
      execute: !!accountId,
    },
  );
}

export function useMilestones(projectId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return [];
      return getMilestonesByProject(id);
    },
    [projectId || ""],
    {
      keepPreviousData: true,
      execute: !!projectId,
    },
  );
}
