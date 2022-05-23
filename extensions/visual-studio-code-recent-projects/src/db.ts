import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path, { basename } from "path";
import initSqlJs from "sql.js";
import get from "lodash.get";
import {
  EntryLike,
  Preferences,
  RecentOpenedId,
  VSCodeBuild,
  lastKnownMenubarItems,
  RecentOpenedItemId,
} from "./types";

const preferences: Preferences = getPreferenceValues();
export const build: VSCodeBuild = preferences.build;

const DB_PATH = `${homedir()}/Library/Application Support/${build}/User/globalStorage/state.vscdb`;
const LEGACY_STORAGE_PATH = `${homedir()}/Library/Application Support/${build}/storage.json`;
const STORAGE_PATH = `${homedir()}/Library/Application Support/${build}/User/globalStorage/storage.json`;

async function loadDB() {
  const fileBuffer = await readFile(DB_PATH);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm"),
  });

  return new SQL.Database(fileBuffer);
}

type QueryResult = {
  values: string[];
}[];

export async function getRecentEntries(): Promise<EntryLike[]> {
  // VS Code version < 1.64.0
  if (existsSync(LEGACY_STORAGE_PATH)) {
    const json = JSON.parse(await readFile(LEGACY_STORAGE_PATH, "utf8"));
    if (json.openedPathsList) {
      return json.openedPathsList.entries;
    }
    const db = await loadDB();
    const res = db.exec(
      "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
    ) as unknown as QueryResult;

    // Filtering is handled by Raycast, so the DB can be closed immediately
    db.close();

    return res.length ? JSON.parse(res[0].values[0]).entries : [];
  } else {
    if (!existsSync(STORAGE_PATH)) return [];

    const json = JSON.parse(await readFile(STORAGE_PATH, "utf8"));
    const lastKnownMenubarItems = get(json, "lastKnownMenubarData.menus.File.items", []) as lastKnownMenubarItems[];
    const recentOpenedMenu = lastKnownMenubarItems.find(({ id }) => id === RecentOpenedId);
    const entries = recentOpenedMenu?.submenu?.items || [];
    return entries
      .filter(({ id }) =>
        [RecentOpenedItemId.File, RecentOpenedItemId.Folder, RecentOpenedItemId.Workspace].includes(id)
      )
      .map(({ id, uri, label }) => {
        switch (id) {
          case RecentOpenedItemId.Workspace:
            return {
              id: id,
              label: label,
              fileUri: `${uri.scheme}://${uri.path}`,
            };

          case RecentOpenedItemId.File:
          default:
            return {
              id: id,
              label: label,
              fileUri: `${uri.scheme}://${uri.path}`,
            };

          case RecentOpenedItemId.Folder:
            return {
              id: id,
              label: "vscode-remote" === uri.scheme ? label : basename(uri.path),
              folderUri: "vscode-remote" === uri.scheme ? uri.external : `${uri.scheme}://${uri.path}`,
              scheme: uri.scheme,
            };
        }
      });
  }
}
