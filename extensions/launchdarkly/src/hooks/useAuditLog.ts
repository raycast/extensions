import { useCachedPromise } from "@raycast/utils";
import { AUDIT_LOG_PAGE_SIZE, fetchAuditLog } from "../api/endpoints";
import { LDAuditLogEntry } from "../types";

interface UseAuditLogParams {
  projectKey: string;
  flagKey?: string;
  environmentKey?: string;
  enabled?: boolean;
}

/** Paginated audit log; pages are keyed by the `date` of the last entry seen. */
export function useAuditLog({ projectKey, flagKey, environmentKey, enabled = true }: UseAuditLogParams) {
  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (projectKey: string, flagKey?: string, environmentKey?: string) =>
      async ({ lastItem }: { lastItem?: LDAuditLogEntry }) => {
        const items = await fetchAuditLog({ projectKey, flagKey, environmentKey, before: lastItem?.date });
        return { data: items, hasMore: items.length === AUDIT_LOG_PAGE_SIZE };
      },
    [projectKey, flagKey, environmentKey],
    { execute: enabled, keepPreviousData: true, failureToastOptions: { title: "Error fetching audit log" } },
  );

  return { entries: data ?? [], isLoading, error, pagination, revalidate };
}
