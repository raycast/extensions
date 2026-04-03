import initSqlJs from "sql.js/dist/sql-asm.js";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { EntryLike } from "./types";
import { isWin } from "./utils";
import { build } from "./preferences";

let sqlJsInitialized = false;
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

const buildSchemes: Record<string, string> = {
  Antigravity: "antigravity",
  Code: "vscode",
  "Code - Insiders": "vscode-insiders",
  Cursor: "cursor",
  Kiro: "kiro",
  VSCodium: "vscode-oss",
  Positron: "positron",
  Windsurf: "windsurf",
  Trae: "trae",
  "Trae CN": "trae-cn",
  Lingma: "lingma",
};

function getBuildName(): string {
  return build;
}

function getDBPath() {
  const buildName = getBuildName();
  if (isWin) {
    return path.join(
      homedir(),
      "AppData",
      "Roaming",
      buildName,
      "User",
      "globalStorage",
      "state.vscdb",
    );
  }
  return path.join(
    homedir(),
    "Library",
    "Application Support",
    buildName,
    "User",
    "globalStorage",
    "state.vscdb",
  );
}

export function getBuildScheme(): string {
  const scheme = buildSchemes[getBuildName()] as string | undefined;
  if (!scheme || scheme.length <= 0) return buildSchemes.Code;
  return scheme;
}

export async function useRecentEntries() {
  const dbPath = getDBPath();

  if (!fs.existsSync(dbPath)) {
    return { data: undefined, isLoading: false, error: true as const };
  }

  try {
    console.log("Initializing sql.js...");

    if (!sqlJsInitialized || !SQL) {
      SQL = await initSqlJs();
      sqlJsInitialized = true;
    }

    if (!SQL) {
      return { data: undefined, isLoading: false, error: true as const };
    }

    console.log("Reading database file...");
    const fileBuffer = fs.readFileSync(dbPath);
    console.log("Creating database...");
    const db = new SQL.Database(fileBuffer);

    console.log("Executing query...");
    const result = db.exec(
      "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'",
    );

    db.close();

    console.log("Query result:", result);
    const entries =
      result.length > 0 && result[0].values.length > 0
        ? (result[0].values[0][0] as string)
        : undefined;

    const parsedEntries = entries
      ? (JSON.parse(entries) as EntryLike[])
      : undefined;

    console.log("Parsed entries:", parsedEntries?.length);
    return { data: parsedEntries, isLoading: false, error: false as const };
  } catch (e) {
    console.log("Error:", e);
    return { data: undefined, isLoading: false, error: true as const };
  }
}
