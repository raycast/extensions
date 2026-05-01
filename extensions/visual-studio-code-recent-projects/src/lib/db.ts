import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { useEffect } from "react";
import { build } from "./preferences";
import { EntryLike, RecentEntries } from "./types";
import { isSameEntry, isWin } from "./utils";
import { execFilePromise } from "../utils/exec";
import { getBuildNamePreference } from "./vscode";

export type RemoveMethods = {
  removeEntry: (entry: EntryLike) => Promise<void>;
  removeAllEntries: () => Promise<void>;
};

const WORKSPACE_STORAGE_RECENT_LIMIT = 500;

export function useRecentEntries() {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      data: [],
      isLoading: false,
      error: true,

      removeEntry: () => Promise.resolve(),
      removeAllEntries: () => Promise.resolve(),
    };
  }

  const { data, isLoading, revalidate } = useSQL<RecentEntries>(
    path,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'",
  );

  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = entries ? (JSON.parse(entries) as EntryLike[]) : undefined;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentEntries = parsedEntries ?? [];
    const mergedEntries = mergeRecentEntries(readWorkspaceStorageEntries(), currentEntries);

    if (areSameEntries(currentEntries, mergedEntries)) {
      return;
    }

    saveEntries(mergedEntries).then(revalidate).catch(console.error);
  }, [entries, isLoading, revalidate]);

  async function removeEntry(entry: EntryLike) {
    if (!parsedEntries) {
      await showToast(Toast.Style.Failure, "No recent entries found");
      return;
    }

    try {
      await saveEntries(parsedEntries.filter((currentEntry) => !isSameEntry(currentEntry, entry)));
      await revalidate();
      showToast(Toast.Style.Success, "Entry removed", `Restart ${build} to sync the list in ${build} (optional)`);
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove entry");
    }
  }

  async function removeAllEntries() {
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
        await saveEntries([]);
        await revalidate();
        showToast(
          Toast.Style.Success,
          "All entries removed",
          `Restart ${build} to sync the list in ${build} (optional)`,
        );
      }
    } catch {
      showToast(Toast.Style.Failure, "Failed to remove entries");
    }
  }

  return { data: parsedEntries, isLoading, removeEntry, removeAllEntries };
}

function getPath() {
  const build = getBuildNamePreference();
  if (isWin) {
    return `${homedir()}\\AppData\\Roaming\\${build}\\User\\globalStorage\\state.vscdb`;
  }
  return `${homedir()}/Library/Application Support/${build}/User/globalStorage/state.vscdb`;
}

async function saveEntries(entries: EntryLike[]) {
  const data = Buffer.from(JSON.stringify({ entries }), "utf8").toString("hex");
  const query = `INSERT INTO ItemTable (key, value) VALUES ('history.recentlyOpenedPathsList', CAST(x'${data}' AS TEXT));`;
  await execFilePromise("sqlite3", [getPath(), query]);
}

function getWorkspaceStoragePath() {
  const build = getBuildNamePreference();
  if (isWin) {
    return `${homedir()}\\AppData\\Roaming\\${build}\\User\\workspaceStorage`;
  }
  return `${homedir()}/Library/Application Support/${build}/User/workspaceStorage`;
}

function readWorkspaceStorageEntries() {
  const workspaceStoragePath = getWorkspaceStoragePath();

  if (!fs.existsSync(workspaceStoragePath)) {
    return [];
  }

  return fs
    .readdirSync(workspaceStoragePath)
    .map((storageFolder) => {
      const workspaceFilePath = path.join(workspaceStoragePath, storageFolder, "workspace.json");

      try {
        const stat = fs.statSync(workspaceFilePath);
        return { workspaceFilePath, mtime: stat.mtimeMs };
      } catch {
        return undefined;
      }
    })
    .filter((item): item is { workspaceFilePath: string; mtime: number } => item !== undefined)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, WORKSPACE_STORAGE_RECENT_LIMIT)
    .map(({ workspaceFilePath }) => {
      try {
        const workspace = JSON.parse(fs.readFileSync(workspaceFilePath, "utf8")) as {
          folder?: string;
          workspace?: string;
        };

        return getEntryFromWorkspaceStorage(workspace);
      } catch {
        return undefined;
      }
    })
    .filter((entry): entry is EntryLike => entry !== undefined);
}

function getEntryFromWorkspaceStorage(workspace: { folder?: string; workspace?: string }): EntryLike | undefined {
  if (workspace.folder) {
    const remoteAuthority = getRemoteAuthority(workspace.folder);

    if (remoteAuthority) {
      return {
        folderUri: workspace.folder,
        remoteAuthority,
        label: getRemoteLabel(workspace.folder),
      };
    }

    return { folderUri: workspace.folder };
  }

  if (workspace.workspace) {
    const remoteAuthority = getRemoteAuthority(workspace.workspace);

    if (remoteAuthority) {
      return {
        workspace: { configPath: workspace.workspace },
        remoteAuthority,
        label: getRemoteLabel(workspace.workspace),
      };
    }

    return { workspace: { configPath: workspace.workspace } };
  }
}

function getRemoteAuthority(uri: string) {
  if (!uri.startsWith("vscode-remote://")) {
    return undefined;
  }

  try {
    return decodeURIComponent(new URL(uri).host);
  } catch {
    return undefined;
  }
}

function getRemoteLabel(uri: string) {
  try {
    return decodeURIComponent(new URL(uri).pathname);
  } catch {
    return "/";
  }
}

function getEntryId(entry: EntryLike) {
  if ("fileUri" in entry) {
    return entry.fileUri;
  }

  if ("folderUri" in entry) {
    return entry.folderUri;
  }

  if ("workspace" in entry) {
    return entry.workspace.configPath;
  }

  return "";
}

export function mergeRecentEntries(primaryEntries: EntryLike[], secondaryEntries: EntryLike[]) {
  const entryIds = new Set<string>();
  const entries: EntryLike[] = [];

  for (const entry of [...primaryEntries, ...secondaryEntries]) {
    const entryId = getEntryId(entry);

    if (!entryId || entryIds.has(entryId)) {
      continue;
    }

    entryIds.add(entryId);
    entries.push(entry);
  }

  return entries;
}

function areSameEntries(a: EntryLike[], b: EntryLike[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((entry, index) => getEntryId(entry) === getEntryId(b[index]));
}
