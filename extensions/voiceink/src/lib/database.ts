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

export function buildQuery(limit: number, searchTerm?: string): string {
  const baseQuery = `
    SELECT
      hex(ZID) as id,
      ZTEXT as text,
      ZENHANCEDTEXT as enhancedText,
      ZTIMESTAMP as timestamp,
      ZDURATION as duration,
      ZTRANSCRIPTIONMODELNAME as modelName,
      ZPOWERMODENAME as powerModeName,
      ZPOWERMODEEMOJI as powerModeEmoji
    FROM ZTRANSCRIPTION
    WHERE ZTRANSCRIPTIONSTATUS = 'completed'
  `;

  let searchClause = "";
  if (searchTerm) {
    const words = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const conditions = words.map((word) => {
        const escaped = escapeSqlString(word);
        return `(ZTEXT LIKE '%${escaped}%' ESCAPE '\\' OR ZENHANCEDTEXT LIKE '%${escaped}%' ESCAPE '\\')`;
      });
      searchClause = ` AND ${conditions.join(" AND ")}`;
    }
  }

  return `${baseQuery}${searchClause} ORDER BY ZTIMESTAMP DESC LIMIT ${limit}`;
}

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function parseTranscriptions(stdout: string): Transcription[] {
  if (!stdout.trim()) return [];

  try {
    const rows: Transcription[] = JSON.parse(stdout);
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
  } catch {
    return [];
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "…";
}

export function getDisplayText(transcription: Transcription): string {
  return transcription.enhancedText || transcription.text;
}
