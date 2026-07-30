import { useCachedPromise } from "@raycast/utils";
import { batchSync } from "../api/sync";
import { Task, Project, Tag, Filter, ProjectGroup } from "../types/ticktick";

export interface SyncData {
  tasks: Task[];
  projects: Project[];
  projectGroups: ProjectGroup[];
  tags: Tag[];
  filters: Filter[];
  inboxId: string;
}

export function useSync() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (): Promise<SyncData> => {
      const response = await batchSync();
      const tasks = (response.syncTaskBean?.update ?? []).filter((t) => t.deleted !== 1 && t.status !== 2);
      return {
        tasks,
        projects: response.projectProfiles ?? [],
        projectGroups: response.projectGroups ?? [],
        tags: response.tags ?? [],
        filters: response.filters ?? [],
        inboxId: response.inboxId ?? "",
      };
    },
    [],
    {
      keepPreviousData: true,
      failureToastOptions: {
        title: "Failed to sync TickTick",
        message: "Sign in again with TickTick if the problem continues",
      },
    },
  );

  return {
    data: data ?? { tasks: [], projects: [], projectGroups: [], tags: [], filters: [], inboxId: "" },
    isLoading,
    error,
    revalidate,
  };
}
