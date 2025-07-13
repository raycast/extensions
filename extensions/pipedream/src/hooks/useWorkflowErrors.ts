import { useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import { fetchWorkflowErrors } from "../services/api";
import { SavedWorkflow } from "../types";
import { isWithinLastWeek } from "../utils/time";
import { useEffect } from "react";

export function useWorkflowErrors(workflows: SavedWorkflow[], orgId?: string, refreshIntervalMs = 0) {
  const fetchCounts = useCallback(async () => {
    if (!orgId || workflows.length === 0) return {} as Record<string, { count: number; lastError?: string }>;

    const info: Record<string, { count: number; lastError?: string }> = {};
    await Promise.all(
      workflows.map(async wf => {
        try {
          const resp = await fetchWorkflowErrors(wf.id, orgId);
          const recent = resp.data.filter(e => isWithinLastWeek(e.indexed_at_ms));
          info[wf.id] = {
            count: recent.length,
            lastError: recent[0]?.event?.error?.msg ?? undefined,
          };
        } catch (_) {
          info[wf.id] = { count: 0 };
        }
      })
    );
    return info;
  }, [orgId, workflows]);

  const {
    data = {},
    revalidate,
    isLoading,
  } = useCachedPromise(fetchCounts, [], {
    execute: !!orgId && workflows.length > 0,
  });

  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    const id = setInterval(revalidate, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs, revalidate]);

  return { errorInfo: data, refreshErrorInfo: revalidate, isLoading };
}
