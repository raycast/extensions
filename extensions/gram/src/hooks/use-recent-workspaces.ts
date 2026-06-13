import { GramWorkspace, parseGramWorkspace, Workspace } from "../lib/workspaces";
import { getOpenWindowIds } from "../lib/utils";
import { showFailureToast, useSQL } from "@raycast/utils";
import { getGramWorkspacesQuery, queryDb } from "../lib/db";
import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";

export type Workspaces = Record<string, Workspace>;

interface RecentWorkspaces {
  workspaces: Workspaces;
  isLoading?: boolean;
  error?: Error;
  removeEntry: (id: number) => Promise<void>;
  removeAllEntries: () => Promise<void>;
  revalidate: () => void;
}

export function useRecentWorkspaces(dbPath: string, dbVersion: number): RecentWorkspaces {
  const { sessionId, windowIds } = getOpenWindowIds(dbPath);
  const { data, isLoading, error, mutate, revalidate } = useSQL<GramWorkspace>(
    dbPath,
    getGramWorkspacesQuery(dbVersion),
  );

  async function removeEntry(id: number): Promise<void> {
    try {
      await mutate(deleteEntryById(dbPath, id), { shouldRevalidateAfter: true });
      showToast(Toast.Style.Success, "Entry removed");
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove entry" });
    }
  }

  async function removeAllEntries(): Promise<void> {
    try {
      if (
        await confirmAlert({
          icon: Icon.Trash,
          title: "Remove all entries?",
          message: "Are you sure? This action cannot be undone.",
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await mutate(deleteAllWorkspaces(dbPath), { shouldRevalidateAfter: true });
        showToast(Toast.Style.Success, "All entries removed");
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove entries" });
    }
  }

  return {
    workspaces: data
      ? data.reduce<Workspaces>((acc, GramWorkspace) => {
          const workspace = parseGramWorkspace(GramWorkspace);
          if (!workspace) {
            return acc;
          }

          const isOpen =
            GramWorkspace.session_id === sessionId &&
            GramWorkspace.window_id !== null &&
            windowIds.has(GramWorkspace.window_id);

          return { ...acc, [String(workspace.id)]: { ...workspace, isOpen } };
        }, {})
      : {},
    isLoading,
    error,
    removeAllEntries,
    removeEntry,
    revalidate,
  };
}

async function deleteEntryById(dbPath: string, id: number) {
  await queryDb(dbPath, `DELETE FROM workspaces WHERE workspace_id = ${id};`);
}

async function deleteAllWorkspaces(dbPath: string) {
  await queryDb(dbPath, "DELETE FROM workspaces;");
}
