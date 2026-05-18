import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { build } from "./preferences";
import { EntryLike, RecentEntries } from "./types";
import { isSameEntry, isWin } from "./utils";
import { execFilePromise } from "../utils/exec";
import { getBuildNamePreference, getProductJSONPath } from "./vscode";

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
  // Newer VS Code releases store history.recentlyOpenedPathsList in
  // StorageScope.APPLICATION_SHARED instead of StorageScope.APPLICATION.
  // The shared storage root is product-specific and is
  // defined by product.json's sharedDataFolderName.
  // https://github.com/microsoft/vscode/pull/311317
  const sharedStoragePath = getSharedStoragePath();

  if (sharedStoragePath && fs.existsSync(sharedStoragePath)) {
    return sharedStoragePath;
  }

  return getGlobalStoragePath();
}

function getGlobalStoragePath() {
  const build = getBuildNamePreference();
  if (isWin) {
    return `${homedir()}\\AppData\\Roaming\\${build}\\User\\globalStorage\\state.vscdb`;
  }
  return `${homedir()}/Library/Application Support/${build}/User/globalStorage/state.vscdb`;
}

function getSharedStoragePath() {
  const sharedDataFolderName = getSharedDataFolderName();

  const sharedPath = sharedDataFolderName
    ? path.join(homedir(), sharedDataFolderName, "sharedStorage", "state.vscdb")
    : undefined;

  return sharedPath;
}

function getSharedDataFolderName() {
  const productJSONPath = getProductJSONPath();

  if (productJSONPath && fs.existsSync(productJSONPath)) {
    try {
      const productJSONString = fs.readFileSync(productJSONPath, "utf-8");
      const productJSON = JSON.parse(productJSONString) as { sharedDataFolderName?: string };
      if (productJSON.sharedDataFolderName) return productJSON.sharedDataFolderName;
    } catch {
      // Ignore malformed product.json.
    }
  }

  return undefined;
}

async function saveEntries(entries: EntryLike[]) {
  const data = JSON.stringify({ entries });
  const query = `INSERT INTO ItemTable (key, value) VALUES ('history.recentlyOpenedPathsList', '${data}');`;
  await execFilePromise("sqlite3", [getPath(), query]);
}
