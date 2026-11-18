import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import type { Transcription } from "./types";

// Known VoiceInk database locations
const DB_PATHS = {
  official: join(homedir(), "Library/Application Support/com.prakashjoshipax.VoiceInk/default.store"),
  ce: join(homedir(), "Library/Application Support/com.metrovoc.VoiceInk/default.store"),
};

// Core Foundation epoch: 2001-01-01 00:00:00 UTC
const CF_EPOCH = 978307200;

// The columns each field has lived in, most recent first. VoiceInk renamed
// powerModeName/powerModeEmoji to modeName/modeEmoji, which SwiftData applies
// to the store as a column rename, so the same install can use either name
// depending on the version that last migrated it. VoiceInk CE uses modeName.
const COLUMN_CANDIDATES = {
  id: ["ZID"],
  text: ["ZTEXT"],
  enhancedText: ["ZENHANCEDTEXT"],
  timestamp: ["ZTIMESTAMP"],
  duration: ["ZDURATION"],
  modelName: ["ZTRANSCRIPTIONMODELNAME"],
  powerModeName: ["ZMODENAME", "ZPOWERMODENAME"],
  powerModeEmoji: ["ZMODEEMOJI", "ZPOWERMODEEMOJI"],
  status: ["ZTRANSCRIPTIONSTATUS"],
} as const;

type Field = keyof typeof COLUMN_CANDIDATES;

// Lists the columns of the transcription table so the history query can be
// built from what the database actually has.
export const SCHEMA_QUERY = "SELECT name FROM pragma_table_info('ZTRANSCRIPTION')";

export interface SchemaColumn {
  name: string;
}

export interface DatabaseInfo {
  path: string;
  available: boolean;
  source: "official" | "ce" | "custom" | "none";
}

function expandTilde(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

export function getDatabaseInfo(): DatabaseInfo {
  const prefs = getPreferenceValues<Preferences>();

  switch (prefs.databaseSource) {
    case "official":
      return {
        path: DB_PATHS.official,
        available: existsSync(DB_PATHS.official),
        source: "official",
      };

    case "ce":
      return {
        path: DB_PATHS.ce,
        available: existsSync(DB_PATHS.ce),
        source: "ce",
      };

    case "custom":
      if (prefs.customDatabasePath) {
        const customPath = expandTilde(prefs.customDatabasePath);
        return {
          path: customPath,
          available: existsSync(customPath),
          source: "custom",
        };
      }
      return { path: "", available: false, source: "none" };

    case "auto":
    default:
      // Auto-detect: prefer official, fallback to CE
      if (existsSync(DB_PATHS.official)) {
        return {
          path: DB_PATHS.official,
          available: true,
          source: "official",
        };
      }
      if (existsSync(DB_PATHS.ce)) {
        return {
          path: DB_PATHS.ce,
          available: true,
          source: "ce",
        };
      }
      return { path: "", available: false, source: "none" };
  }
}

export function cfTimeToDate(cfTimestamp: number): Date {
  return new Date((cfTimestamp + CF_EPOCH) * 1000);
}

export function formatRelativeTime(cfTimestamp: number): string {
  const date = cfTimeToDate(cfTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function resolveColumns(columns: string[]): Partial<Record<Field, string>> {
  const available = new Set(columns);
  const resolved: Partial<Record<Field, string>> = {};

  for (const field of Object.keys(COLUMN_CANDIDATES) as Field[]) {
    resolved[field] = COLUMN_CANDIDATES[field].find((candidate) => available.has(candidate));
  }

  return resolved;
}

function selectAs(column: string | undefined, alias: string): string {
  return `${column ?? "NULL"} as ${alias}`;
}

export function buildQuery(limit: number, searchTerm: string | undefined, columns: string[]): string {
  const resolved = resolveColumns(columns);

  // Z_PK is Core Data's own primary key, so it is there even if ZID is not.
  const idColumn = resolved.id ? `hex(${resolved.id})` : "CAST(Z_PK AS TEXT)";
  const selectList = [
    `${idColumn} as id`,
    selectAs(resolved.text, "text"),
    selectAs(resolved.enhancedText, "enhancedText"),
    selectAs(resolved.timestamp, "timestamp"),
    selectAs(resolved.duration, "duration"),
    selectAs(resolved.modelName, "modelName"),
    selectAs(resolved.powerModeName, "powerModeName"),
    selectAs(resolved.powerModeEmoji, "powerModeEmoji"),
  ].join(",\n      ");

  const baseQuery = `
    SELECT
      ${selectList}
    FROM ZTRANSCRIPTION
    WHERE ${resolved.status ? `${resolved.status} = 'completed'` : "1 = 1"}
  `;

  const searchableColumns = [resolved.text, resolved.enhancedText].filter((column): column is string =>
    Boolean(column)
  );

  let searchClause = "";
  if (searchTerm && searchableColumns.length > 0) {
    const words = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const conditions = words.map((word) => {
        const escaped = escapeSqlString(word);
        const matches = searchableColumns.map((column) => `${column} LIKE '%${escaped}%' ESCAPE '\\'`);
        return `(${matches.join(" OR ")})`;
      });
      searchClause = ` AND ${conditions.join(" AND ")}`;
    }
  }

  return `${baseQuery}${searchClause} ORDER BY ${resolved.timestamp ?? "Z_PK"} DESC LIMIT ${limit}`;
}

function escapeSqlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function normalizeTranscriptions(rows: Transcription[]): Transcription[] {
  return rows.map((row) => ({
    id: row.id,
    text: row.text || "",
    enhancedText: row.enhancedText,
    timestamp: row.timestamp,
    duration: row.duration || 0,
    modelName: row.modelName,
    powerModeName: row.powerModeName,
    powerModeEmoji: row.powerModeEmoji,
  }));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "…";
}

export function getDisplayText(transcription: Transcription): string {
  return transcription.enhancedText || transcription.text;
}
