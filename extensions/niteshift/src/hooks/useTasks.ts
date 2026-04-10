import { useCachedPromise } from "@raycast/utils";
import type { ApiClient } from "../api/client";
import type { Task } from "../api/types";

export function useTasks(client: ApiClient, repositoryId: string | null) {
  return useCachedPromise(
    async (id: string | null) => {
      // include_archived defaults to true on the API (omitting it returns
      // archived + non-archived tasks), so we explicitly pass false to keep
      // the list view focused on active work. Archived tasks are still
      // visible in the Niteshift web UI.
      const params: Record<string, string> = {
        limit: "50",
        include_archived: "false",
      };
      if (id) params.repository_id = id;
      const res = await client.get<{ tasks?: Task[] }>("/api/task", params);
      // Belt-and-suspenders: also filter client-side in case the API ever
      // changes its default and starts returning archived tasks despite the
      // include_archived=false param.
      return (res.tasks ?? []).filter((t) => !t.archived);
    },
    [repositoryId],
    { keepPreviousData: true },
  );
}
