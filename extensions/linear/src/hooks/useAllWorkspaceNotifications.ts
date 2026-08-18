import { useCachedPromise } from "@raycast/utils";

import { getNotifications, NotificationResult } from "../api/getNotifications";
import { getLinearClientFor } from "../api/linearClient";
import { migrateIfNeeded, WorkspaceEntry } from "../api/workspaces";

// No client on the row: useCachedPromise JSON-serializes this result to Raycast's
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

// Menu-bar data source (P4): strictly read-only on the registry; per-entry clients;
// background-safe token access only (never authorize(), §4.3). One row per ENTRY —
// two entries can share an orgId (D10), so grouping is by entryKey.
export default function useAllWorkspaceNotifications() {
  const { data, isLoading, mutate } = useCachedPromise(async (): Promise<WorkspaceNotificationRow[]> => {
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
  }, []);
  return { rows: data ?? [], isLoading, mutate };
}
