import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import { build } from "./preferences";
import { EntryLike, RecentEntries } from "./types";
import { isSameEntry, isWin } from "./utils";
import { execFilePromise } from "../utils/exec";
import { getBuildNamePreference, getProductJSONPath } from "./vscode";

// VS Code currently persists recent workspaces under `recently.opened`, while
// older Electron-main builds used `history.recentlyOpenedPathsList`.
const recentEntriesStorageKeys = ["recently.opened", "history.recentlyOpenedPathsList"] as const;
const recentEntriesQuery = `
  SELECT
    key,
    json_extract(value, '$.entries') as entries
  FROM ItemTable
  WHERE key IN (${recentEntriesStorageKeys.map((key) => `'${key}'`).join(", ")})
  ORDER BY CASE key
    WHEN 'recently.opened' THEN 0
    WHEN 'history.recentlyOpenedPathsList' THEN 1
    ELSE 2
  END
  LIMIT 1
`;

type RecentEntriesRow = RecentEntries & {
  key: (typeof recentEntriesStorageKeys)[number];
};

type StoredBackupFolder = {
  folderUri: string;
  remoteAuthority?: string;
};

type StoredBackupWorkspace = {
  workspace: {
    id: string;
    configPath: string;
  };
  remoteAuthority?: string;
};

type StoredBackupWorkspaces = {
  folders?: StoredBackupFolder[];
  workspaces?: StoredBackupWorkspace[];
};

type StoredProfileAssociations = {
  workspaces?: Record<string, string>;
};

type StoredGlobalState = {
  backupWorkspaces?: StoredBackupWorkspaces;
  profileAssociations?: StoredProfileAssociations;
};

export type RemoveMethods = {
  removeEntry: (entry: EntryLike) => Promise<void>;
  removeAllEntries: () => Promise<void>;
};

async function warnRemoveNotSupported(title = "No removable recent entries found") {
  await showToast(Toast.Style.Failure, title);
}

/**
 * Loads recent VS Code entries from the current state database and supplements
 * them with `storage.json` metadata used by newer backup/profile flows.
 */
export function useRecentEntries() {
  const databasePath = useMemo(() => getStateDatabasePath(), []);
  const fallbackEntries = useMemo(() => getFallbackEntries(), [databasePath]);
  const [suppressedStorageEntryKeys, setSuppressedStorageEntryKeys] = useState<Set<string>>(new Set());
  const storageEntryKeys = useMemo(
    () => new Set(fallbackEntries.map((entry) => getEntryKey(entry)).filter((key): key is string => key !== undefined)),
    [fallbackEntries],
  );
  const visibleFallbackEntries = useMemo(
    () =>
      fallbackEntries.filter((entry) => {
        const key = getEntryKey(entry);
        return !key || !suppressedStorageEntryKeys.has(key);
      }),
    [fallbackEntries, suppressedStorageEntryKeys],
  );

  useEffect(() => {
    setSuppressedStorageEntryKeys(new Set());
  }, [databasePath]);

  const suppressStorageEntries = (entryKeys: string[]) => {
    if (entryKeys.length === 0) {
      return;
    }

    setSuppressedStorageEntryKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      for (const entryKey of entryKeys) {
        nextKeys.add(entryKey);
      }

      return nextKeys;
    });
  };

  const getVisibleStorageEntryKeys = (entries: EntryLike[]) =>
    entries
      .map((entry) => getEntryKey(entry))
      .filter((entryKey): entryKey is string => entryKey !== undefined && storageEntryKeys.has(entryKey));

  const showStorageEntriesHiddenToast = async (title: string) => {
    await showToast(Toast.Style.Success, title, "Storage-backed copies are hidden for this Raycast session");
  };

  if (!fs.existsSync(databasePath)) {
    return {
      data: visibleFallbackEntries,
      isLoading: false,
      error: visibleFallbackEntries.length === 0,

      removeEntry: async (entry: EntryLike) => {
        const entryKey = getEntryKey(entry);

        if (!entryKey || !storageEntryKeys.has(entryKey)) {
          await warnRemoveNotSupported();
          return;
        }

        suppressStorageEntries([entryKey]);
        await showStorageEntriesHiddenToast("Entry removed");
      },
      removeAllEntries: async () => {
        const visibleStorageEntryKeys = getVisibleStorageEntryKeys(visibleFallbackEntries);

        if (visibleStorageEntryKeys.length === 0) {
          await warnRemoveNotSupported();
          return;
        }

        if (
          await confirmAlert({
            icon: Icon.Trash,
            title: "Remove all recent entries?",
            message: "This cannot be undone.",
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
          suppressStorageEntries(visibleStorageEntryKeys);
          await showStorageEntriesHiddenToast("All visible entries removed");
        }
      },
    };
  }

  const { data, isLoading, revalidate } = useSQL<RecentEntriesRow>(databasePath, recentEntriesQuery);
  const storageKey = data && data.length ? data[0].key : recentEntriesStorageKeys[0];
  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = parseEntryList(entries);
  const combinedEntries = mergeEntries(parsedEntries, visibleFallbackEntries);

  async function removeEntry(entry: EntryLike) {
    if (!combinedEntries) {
      await warnRemoveNotSupported();
      return;
    }

    const entryKey = getEntryKey(entry);
    const isDatabaseEntry = (parsedEntries ?? []).some((currentEntry) => isSameEntry(currentEntry, entry));
    const isStorageEntry = entryKey ? storageEntryKeys.has(entryKey) : false;

    try {
      if (isDatabaseEntry && parsedEntries) {
        await saveEntries(
          parsedEntries.filter((currentEntry) => !isSameEntry(currentEntry, entry)),
          [storageKey],
          databasePath,
        );
      }

      if (entryKey && isStorageEntry) {
        suppressStorageEntries([entryKey]);
      }

      if (isDatabaseEntry) {
        await revalidate();
      }

      showToast(
        Toast.Style.Success,
        "Entry removed",
        isStorageEntry
          ? "Storage-backed copies are hidden for this Raycast session"
          : `Restart ${build} to sync the list in ${build} (optional)`,
      );
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove entry");
    }
  }

  async function removeAllEntries() {
    const visibleDatabaseEntries = (combinedEntries ?? []).filter((entry) =>
      (parsedEntries ?? []).some((currentEntry) => isSameEntry(currentEntry, entry)),
    );
    const visibleStorageEntryKeys = getVisibleStorageEntryKeys(combinedEntries ?? []);

    if (visibleDatabaseEntries.length === 0) {
      if (visibleStorageEntryKeys.length === 0) {
        await warnRemoveNotSupported();
        return;
      }

      if (
        await confirmAlert({
          icon: Icon.Trash,
          title: "Remove all recent entries?",
          message: "This cannot be undone.",
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
        suppressStorageEntries(visibleStorageEntryKeys);
        await showStorageEntriesHiddenToast("All visible entries removed");
      }
      return;
    }

    try {
      if (
        await confirmAlert({
          icon: Icon.Trash,
          title: "Remove all recent entries?",
          message: "This cannot be undone.",
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
        await saveEntries([], recentEntriesStorageKeys, databasePath);
        suppressStorageEntries(visibleStorageEntryKeys);
        await revalidate();
        showToast(
          Toast.Style.Success,
          "All removable entries removed",
          visibleStorageEntryKeys.length > 0
            ? "Storage-backed copies are hidden for this Raycast session"
            : `Restart ${build} to sync the list in ${build} (optional)`,
        );
      }
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove entries");
    }
  }

  return { data: combinedEntries, isLoading, removeEntry, removeAllEntries };
}

function getStateDatabasePath() {
  const sharedStateDatabasePath = getSharedStateDatabasePath();

  if (sharedStateDatabasePath && fs.existsSync(sharedStateDatabasePath)) {
    return sharedStateDatabasePath;
  }

  return path.join(getGlobalStorageDirectory(), "state.vscdb");
}

function getStorageJsonPath() {
  return path.join(getGlobalStorageDirectory(), "storage.json");
}

function getGlobalStorageDirectory() {
  const build = getBuildNamePreference();

  if (isWin) {
    const appDataPath = process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming");
    return path.join(appDataPath, build, "User", "globalStorage");
  }

  return path.join(homedir(), "Library", "Application Support", build, "User", "globalStorage");
}

function getSharedStateDatabasePath() {
  const sharedDataFolderName = getSharedDataFolderName();

  if (!sharedDataFolderName) return undefined;

  // sharedDataFolderName (e.g. ".vscode-shared") lives directly in the home
  // directory on all platforms — not in AppData/Roaming or Library/Application Support.
  return path.join(homedir(), sharedDataFolderName, "sharedStorage", "state.vscdb");
}

function getSharedDataFolderName() {
  const productJSONPath = getProductJSONPath();

  if (productJSONPath && fs.existsSync(productJSONPath)) {
    try {
      const productJSONString = fs.readFileSync(productJSONPath, "utf-8");
      const productJSON = JSON.parse(productJSONString) as { sharedDataFolderName?: string };
      if (productJSON.sharedDataFolderName) {
        return productJSON.sharedDataFolderName;
      }
    } catch {
      // Ignore malformed product.json.
    }
  }

  return undefined;
}

async function saveEntries(
  entries: EntryLike[],
  storageKeys: readonly (typeof recentEntriesStorageKeys)[number][],
  databasePath: string,
) {
  const data = JSON.stringify({ entries }).replace(/'/g, "''");
  const query = storageKeys
    .map((storageKey) => `INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('${storageKey}', '${data}');`)
    .join("\n");
  await execFilePromise("sqlite3", [databasePath, query]);
}

function getFallbackEntries(): EntryLike[] {
  const storageState = getStoredGlobalState();
  if (!storageState) {
    return [];
  }

  const backupEntries = getBackupWorkspaceEntries(storageState);
  const profileEntries = getProfileAssociationEntries(storageState);
  return mergeEntries(undefined, [...backupEntries, ...profileEntries]) ?? [];
}

function getStoredGlobalState(): StoredGlobalState | undefined {
  const storageJsonPath = getStorageJsonPath();
  if (!fs.existsSync(storageJsonPath)) {
    return undefined;
  }

  try {
    const storageContents = fs.readFileSync(storageJsonPath, "utf8");
    return JSON.parse(storageContents) as StoredGlobalState;
  } catch {
    return undefined;
  }
}

function getBackupWorkspaceEntries(storageState: StoredGlobalState): EntryLike[] {
  const backupWorkspaces = storageState.backupWorkspaces;
  if (!backupWorkspaces) {
    return [];
  }

  const workspaceEntries = backupWorkspaces.workspaces ?? [];
  const folderEntries = backupWorkspaces.folders ?? [];

  return [...workspaceEntries, ...folderEntries].reverse();
}

function getProfileAssociationEntries(storageState: StoredGlobalState): EntryLike[] {
  const workspaceAssociations = storageState.profileAssociations?.workspaces;
  if (!workspaceAssociations) {
    return [];
  }

  return Object.keys(workspaceAssociations)
    .reverse()
    .map((uri) => toEntryFromUri(uri))
    .filter((entry): entry is EntryLike => entry !== undefined);
}

function parseEntryList(entries: string | undefined): EntryLike[] | undefined {
  if (!entries) {
    return undefined;
  }

  try {
    return JSON.parse(entries) as EntryLike[];
  } catch {
    return undefined;
  }
}

function mergeEntries(databaseEntries: EntryLike[] | undefined, backupEntries: EntryLike[]): EntryLike[] | undefined {
  const mergedEntries: EntryLike[] = [];
  const seenEntries = new Set<string>();
  const primaryEntries = hasBrowsableEntries(databaseEntries) ? (databaseEntries ?? []) : backupEntries;
  const secondaryEntries = hasBrowsableEntries(databaseEntries) ? backupEntries : (databaseEntries ?? []);

  for (const entry of [...primaryEntries, ...secondaryEntries]) {
    const key = getEntryKey(entry);
    if (!key || seenEntries.has(key)) {
      continue;
    }

    seenEntries.add(key);
    mergedEntries.push(entry);
  }

  return mergedEntries.length > 0 ? mergedEntries : undefined;
}

function hasBrowsableEntries(entries: EntryLike[] | undefined): boolean {
  return (entries ?? []).some((entry) => {
    if ("folderUri" in entry) {
      return entry.folderUri.startsWith("file://") || entry.folderUri.startsWith("vscode-remote://");
    }

    if ("workspace" in entry) {
      return (
        entry.workspace.configPath.startsWith("file://") || entry.workspace.configPath.startsWith("vscode-remote://")
      );
    }

    if ("fileUri" in entry) {
      return entry.fileUri.startsWith("file://") || entry.fileUri.startsWith("vscode-remote://");
    }

    return false;
  });
}

function getEntryKey(entry: EntryLike): string | undefined {
  if ("folderUri" in entry) {
    return `folder:${entry.folderUri}`;
  }

  if ("workspace" in entry) {
    return `workspace:${entry.workspace.configPath}`;
  }

  if ("fileUri" in entry) {
    return `file:${entry.fileUri}`;
  }

  return undefined;
}

function toEntryFromUri(uri: string): EntryLike | undefined {
  if (uri.endsWith(".code-workspace")) {
    const remoteAuthority = getRemoteAuthorityFromUri(uri);
    return remoteAuthority ? { workspace: { configPath: uri }, remoteAuthority } : { workspace: { configPath: uri } };
  }

  const remoteAuthority = getRemoteAuthorityFromUri(uri);
  return remoteAuthority ? { folderUri: uri, remoteAuthority } : { folderUri: uri };
}

function getRemoteAuthorityFromUri(uri: string): string | undefined {
  if (!uri.startsWith("vscode-remote://")) {
    return undefined;
  }

  try {
    return decodeURIComponent(new URL(uri).host);
  } catch {
    return undefined;
  }
}
