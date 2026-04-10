import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import type { ApiClient } from "../api/client";
import type { TaskStatus, WorkflowStateResponse } from "../api/types";

const TERMINAL: ReadonlySet<TaskStatus> = new Set(["error", "deleted", "suspended"]);

export function useTaskState(client: ApiClient, taskId: string) {
  const result = useCachedPromise(
    async (id: string) => client.get<WorkflowStateResponse>(`/api/task/${id}/state`),
    [taskId],
  );

  useEffect(() => {
    if (!result.data) return; // wait for the initial load before polling
    const state = result.data.state;
    if (state && TERMINAL.has(state)) return;
    const interval = setInterval(() => result.revalidate(), 3000);
    return () => clearInterval(interval);
    // Intentionally only depending on the state. The `result.revalidate`
    // identity may change between renders, but capturing a stale closure here
    // just polls slightly later — no correctness issue. The @raycast eslint
    // config doesn't include react-hooks/exhaustive-deps so no disable
    // directive is needed.
  }, [result.data?.state]);

  return result;
}
