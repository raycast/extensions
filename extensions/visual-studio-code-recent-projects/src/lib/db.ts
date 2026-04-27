import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import { build } from "./preferences";
import { EntryLike, RecentEntries } from "./types";
import { isSameEntry, isWin } from "./utils";
import { execFilePromise } from "../utils/exec";
import { getBuildNamePreference } from "./vscode";

export type RemoveMethods = {
  removeEntry: (entry: EntryLike) => Promise<void>;
  removeAllEntries: () => Promise<void>;
};

export function useRecentEntries() {
  const path = getStoragePath("state.vscdb");

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

  const effectiveEntries = parsedEntries ?? (!isLoading ? getEntriesFromStorageJSON() : undefined);

  async function removeEntry(entry: EntryLike) {
    if (!parsedEntries) {
      await showToast(Toast.Style.Failure, "Removing entries is not supported when reading from storage.json");
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
    if (!parsedEntries) {
      await showToast(Toast.Style.Failure, "Removing entries is not supported when reading from storage.json");
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

  return { data: effectiveEntries, isLoading, removeEntry, removeAllEntries };
}

function getStoragePath(filename: string) {
  const build = getBuildNamePreference();
  if (isWin) {
    return `${homedir()}\\AppData\\Roaming\\${build}\\User\\globalStorage\\${filename}`;
  }
  return `${homedir()}/Library/Application Support/${build}/User/globalStorage/${filename}`;
}

function getEntriesFromStorageJSON(): EntryLike[] | undefined {
  try {
    const storagePath = getStoragePath("storage.json");
    if (!fs.existsSync(storagePath)) return undefined;

    const raw = fs.readFileSync(storagePath, "utf-8");
    const storage = JSON.parse(raw) as Record<string, unknown>;

    const menus = (storage?.lastKnownMenubarData as Record<string, unknown> | undefined)?.menus;
    if (!menus || typeof menus !== "object" || Array.isArray(menus)) return undefined;

    const seen = new Set<string>();
    const results: EntryLike[] = [];

    function walkItems(items: unknown[]) {
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        if (obj.id === "openRecentFolder") {
          const uri = obj.uri as Record<string, unknown> | undefined;
          if (uri) {
            const scheme = typeof uri.scheme === "string" ? uri.scheme : "file";
            const uriPath = typeof uri.path === "string" ? uri.path : undefined;
            const authority = typeof uri.authority === "string" ? uri.authority : "";
            if (uriPath) {
              const folderUri = `${scheme}://${authority}${uriPath}`;
              if (!seen.has(folderUri)) {
                seen.add(folderUri);
                results.push({ folderUri });
              }
            }
          }
        }

        const submenu = obj.submenu as Record<string, unknown> | undefined;
        if (submenu && Array.isArray(submenu.items)) walkItems(submenu.items as unknown[]);
      }
    }

    for (const menu of Object.values(menus as Record<string, unknown>)) {
      if (menu && typeof menu === "object") {
        const menuObj = menu as Record<string, unknown>;
        if (Array.isArray(menuObj.items)) walkItems(menuObj.items as unknown[]);
      }
    }

    return results.length > 0 ? results : undefined;
  } catch {
    return undefined;
  }
}

async function saveEntries(entries: EntryLike[]) {
  const data = JSON.stringify({ entries });
  const query = `INSERT INTO ItemTable (key, value) VALUES ('history.recentlyOpenedPathsList', '${data}');`;
  await execFilePromise("sqlite3", [getStoragePath("state.vscdb"), query]);
}
