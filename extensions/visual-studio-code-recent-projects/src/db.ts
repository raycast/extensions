import { environment, getPreferenceValues } from "@raycast/api";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";
import initSqlJs from "sql.js";
import { EntryLike, Preferences, VSCodeBuild } from "./types";

const preferences: Preferences = getPreferenceValues();
export const build: VSCodeBuild = preferences.build;

const DB_PATH = `${homedir()}/Library/Application Support/${build}/User/globalStorage/state.vscdb`;
const LEGACY_STORAGE_PATH = `${homedir()}/Library/Application Support/${build}/storage.json`;

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
  const json = JSON.parse(await readFile(LEGACY_STORAGE_PATH, "utf8"));
  if (json.openedPathsList) {
    return json.openedPathsList.entries;
  }

  const db = await loadDB();
  const res = db.exec(
    "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'",
  ) as unknown as QueryResult;

  // Filtering is handled by Raycast, so the DB can be closed immediately
  db.close();

  return res.length ? JSON.parse(res[0].values[0]).entries : [];
}
