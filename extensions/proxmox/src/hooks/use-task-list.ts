import type { PveServer, PveTask } from "@/types";
import { useMultiPveFetch } from "@/hooks/use-multi-pve-fetch";

export type TaskListGroup = {
  server: PveServer;
  tasks: PveTask[];
  error?: string;
};

/** Hook to get the recent tasks of every configured server */
export const useTaskList = () => {
  const { data, servers, isLoading, revalidate } = useMultiPveFetch<PveTask[]>("api2/json/cluster/tasks", {
    timerInterval: 2000,
  });

  const groups: TaskListGroup[] = (data ?? []).map((result) => ({
    server: result.server,
    error: result.error,
    tasks: result.data ?? [],
  }));

  return {
    isLoading,
    groups,
    hasServers: servers.length > 0,
    revalidate,
  };
};
