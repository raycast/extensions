import { Cache } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";

import { getNotifications, NotificationResult } from "../api/getNotifications";
import { getLinearClientFor } from "../api/linearClient";
import { migrateIfNeeded, WorkspaceEntry } from "../api/workspaces";

// No client on the row: useCachedState JSON-serializes this result to Raycast's
// UNENCRYPTED cache. A LinearClient instance carries its bearer token in an
// Authorization header — persisting it here would write the token to disk, and a
// rehydrated cache row would carry a method-less plain object anyway. Actions resolve
// the client on demand via getLinearClientFor (see unread-notifications.tsx).
export type WorkspaceNotificationRow = {
  entry: WorkspaceEntry;
  status: "ok" | "needs-reauth";
  urlKey: string;
  notifications: NotificationResult[];
};

// Named namespace so Manage Workspaces can drop cached rows the moment a workspace is
// removed (Greptile review on PR #30314): useCachedPromise's namespace is a hash of its
// fetcher and cannot be addressed from another command.
export const NOTIFICATIONS_CACHE_NAMESPACE = "linear-workspace-notifications";
const ROWS_KEY = "rows";

export function clearWorkspaceNotificationsCache(): void {
  new Cache({ namespace: NOTIFICATIONS_CACHE_NAMESPACE }).clear();
}

// Menu-bar data source (P4): strictly read-only on the registry; per-entry clients;
// background-safe token access only (never authorize(), §4.3). One row per ENTRY —
// two entries can share an orgId (D10), so grouping is by entryKey.
export default function useAllWorkspaceNotifications() {
  const [cachedRows, setCachedRows] = useCachedState<WorkspaceNotificationRow[]>(ROWS_KEY, [], {
    cacheNamespace: NOTIFICATIONS_CACHE_NAMESPACE,
  });
  const { data, isLoading, mutate } = usePromise(
    async (): Promise<WorkspaceNotificationRow[]> => {
      const registry = await migrateIfNeeded({ allowWrite: false });
      return Promise.all(
        registry.workspaces.map(async (entry): Promise<WorkspaceNotificationRow> => {
          try {
            const { linearClient } = await getLinearClientFor(
              { orgId: entry.orgId, userId: entry.userId },
              { interactive: false },
            );
            const { notifications, urlKey } = await getNotifications(linearClient);
            return {
              entry,
              status: "ok",
              urlKey: urlKey ?? entry.urlKey,
              notifications: notifications ?? [],
            };
          } catch {
            // Expired-with-no-refresh, revoked, or transient failure: render the
            // re-auth row; NEVER log the workspace out from the menu bar (S6/S7, T13).
            return { entry, status: "needs-reauth", urlKey: entry.urlKey, notifications: [] };
          }
        }),
      );
    },
    [],
    { onData: setCachedRows },
  );
  // Live data first: usePromise's mutate(..., { optimisticUpdate }) writes to `data`, not to
  // the cached copy, so returning `data ?? cachedRows` keeps optimistic updates visible.
  return { rows: data ?? cachedRows, isLoading, mutate };
}
