import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { homedir } from "os";
import { EntryLike, RecentEntries } from "./types";
import fs from "fs";
import { isSameEntry } from "./utils";
import { execFilePromise } from "./utils/exec";
import { WINDSURF_DB_PATHS } from "./constants";

export type RemoveMethods = {
  removeEntry: (entry: EntryLike) => Promise<void>;
  removeAllEntries: () => Promise<void>;
};

export function useRecentEntries() {
  const path = getPath();

  if (!path || !fs.existsSync(path)) {
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
  const parsedEntries = entries
    ? (JSON.parse(entries) as EntryLike[])
    : undefined;

  async function removeEntry(entry: EntryLike) {
    if (!parsedEntries) {
      await showToast(Toast.Style.Failure, "No recent entries found");
      return;
    }

    try {
      await saveEntries(
        parsedEntries.filter(
          (currentEntry) => !isSameEntry(currentEntry, entry)
        )
      );
      await revalidate();
      showToast(
        Toast.Style.Success,
        "Entry removed",
        `Restart Windsurf to sync the list in Windsurf (optional)`
      );
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
        showToast(
          Toast.Style.Success,
          "All entries removed",
          `Restart Windsurf to sync the list in Windsurf (optional)`
        );
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to remove entries");
    }
  }

  return { data: parsedEntries, isLoading, removeEntry, removeAllEntries };
}

function getPath(): string | null {
  // Expand ~ to home directory and check which path exists
  for (const dbPath of WINDSURF_DB_PATHS) {
    const expandedPath = dbPath.replace("~", homedir());
    if (fs.existsSync(expandedPath)) {
      return expandedPath;
    }
  }

  // Return the first path as fallback (will fail gracefully if not found)
  return WINDSURF_DB_PATHS[0].replace("~", homedir());
}

async function saveEntries(entries: EntryLike[]) {
  const path = getPath();
  if (!path) {
    throw new Error("Windsurf database not found");
  }

  const data = JSON.stringify({ entries });
  const query = `INSERT INTO ItemTable (key, value) VALUES ('history.recentlyOpenedPathsList', '${data}');`;
  await execFilePromise("sqlite3", [path, query]);
}
