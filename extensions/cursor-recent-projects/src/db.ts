import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { homedir } from "os";
import { join } from "path";
import { EntryLike, RecentEntries } from "./types";
import fs from "fs";
import { isSameEntry } from "./utils";
import { execFilePromise } from "./utils/exec";
import { getAppDataPath, isWindows, writeRecentEntriesJSON } from "./utils/windows";

export type RemoveMethods = {
  removeEntry: (entry: EntryLike) => Promise<void>;
  removeAllEntries: () => Promise<void>;
};

export function useRecentEntries() {
  const path = getPath();

  if (!fs.existsSync(path)) {
    return {
      data: [],
      isLoading: false,
      error: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      removeEntry: (entry: EntryLike) => Promise.resolve(),
      removeAllEntries: () => Promise.resolve(),
    };
  }

  const { data, isLoading, revalidate } = useSQL<RecentEntries>(
    path,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
  );

  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = entries ? (JSON.parse(entries) as EntryLike[]) : undefined;

  async function removeEntry(entry: EntryLike) {
    if (!parsedEntries) {
      await showToast(Toast.Style.Failure, "No recent entries found");
      return;
    }

    try {
      await saveEntries(parsedEntries.filter((currentEntry) => !isSameEntry(currentEntry, entry)));
      await revalidate();
      showToast(Toast.Style.Success, "Entry removed", `Restart Cursor to sync the list in Cursor (optional)`);
    } catch (error) {
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
        showToast(Toast.Style.Success, "All entries removed", `Restart Cursor to sync the list in Cursor (optional)`);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to remove entries");
    }
  }

  return { data: parsedEntries, isLoading, removeEntry, removeAllEntries };
}

export function getPath() {
  if (isWindows) {
    return join(getAppDataPath(), "Cursor", "User", "globalStorage", "state.vscdb");
  }
  return `${homedir()}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
}

async function saveEntries(entries: EntryLike[]) {
  const data = JSON.stringify({ entries });
  if (isWindows) {
    await writeRecentEntriesJSON(getPath(), data);
    return;
  }
  const query = `INSERT INTO ItemTable (key, value) VALUES ('history.recentlyOpenedPathsList', '${data}');`;
  await execFilePromise("sqlite3", [getPath(), query]);
}
