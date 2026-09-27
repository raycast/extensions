import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listTasks, searchTasks } from "../api/tasks";
import type { RitualTask, Scope } from "../api/types";
import { resolveCli } from "../preferences";

export type TaskSource =
  { kind: "scope"; scope: Scope } | { kind: "search"; query: string };

/// One read path for every list. `keepPreviousData` is what stops the list
/// blanking between scope switches and between keystrokes in search.
export function useTasks(source: TaskSource) {
  const key = source.kind === "scope" ? source.scope : `search:${source.query}`;
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (_key: string, current: TaskSource): Promise<RitualTask[]> => {
      if (current.kind === "search" && !current.query.trim()) return [];
      const cli = resolveCli();
      return current.kind === "scope"
        ? listTasks(cli, current.scope)
        : searchTasks(cli, current.query);
    },
    [key, source],
    {
      initialData: [],
      keepPreviousData: true,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Ritual",
          message: error.message,
        });
      },
    },
  );
  return { tasks: data ?? [], isLoading, error, revalidate, mutate };
}
