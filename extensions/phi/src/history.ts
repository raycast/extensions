import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ApplicationChannel } from "./types";

const HISTORY_FILENAME = "History";
const LOCAL_STATE_FILENAME = "Local State";
const PREFERENCES_FILENAME = "Preferences";
const CHROME_EPOCH_OFFSET_MS = 11_644_473_600_000;

type UnknownRecord = Record<string, unknown>;

export interface HistoryProfile {
  id: string;
  name: string | undefined;
  historyDatabasePath: string;
}

export interface HistorySqlRow {
  id: number;
  url: string;
  title: string;
  lastVisitedAtMs: number;
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: Date;
  profileId: string;
  profileName: string | undefined;
}

export interface HistorySource {
  basePath: string;
  profiles: HistoryProfile[];
}

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

export function phiHistoryBasePath(channel: ApplicationChannel): string {
  const directory =
    channel === "stable" ? "com.phibrowser.Mac" : "com.phibrowser.canary.Mac";
  return join(homedir(), "Library", "Application Support", directory);
}

function localStateProfileNames(basePath: string): Map<string, string> {
  try {
    const root = record(
      JSON.parse(
        readFileSync(join(basePath, LOCAL_STATE_FILENAME), "utf8"),
      ) as unknown,
    );
    const profile = record(root?.profile);
    const infoCache = record(profile?.info_cache);
    if (!infoCache) {
      return new Map();
    }

    return new Map(
      Object.entries(infoCache).flatMap(([id, value]) => {
        const name = record(value)?.name;
        return typeof name === "string" && name.length > 0
          ? [[id, name] as const]
          : [];
      }),
    );
  } catch {
    return new Map();
  }
}

function profileNameFromPreferences(
  basePath: string,
  profileId: string,
): string | undefined {
  try {
    const root = record(
      JSON.parse(
        readFileSync(join(basePath, profileId, PREFERENCES_FILENAME), "utf8"),
      ) as unknown,
    );
    const name = record(root?.profile)?.name;
    return typeof name === "string" && name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}

function directoryProfileIds(basePath: string): string[] {
  try {
    return readdirSync(basePath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(basePath, entry.name, HISTORY_FILENAME)),
      )
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function loadPhiHistoryProfiles(basePath: string): HistoryProfile[] {
  const names = localStateProfileNames(basePath);
  const ids = new Set([...names.keys(), ...directoryProfileIds(basePath)]);

  return [...ids]
    .sort((left, right) => {
      if (left === "Default") {
        return -1;
      }
      if (right === "Default") {
        return 1;
      }
      return left.localeCompare(right, "en", { numeric: true });
    })
    .flatMap((id) => {
      const historyDatabasePath = join(basePath, id, HISTORY_FILENAME);
      if (!existsSync(historyDatabasePath)) {
        return [];
      }
      const name = names.get(id) ?? profileNameFromPreferences(basePath, id);
      return [{ id, name, historyDatabasePath }];
    });
}

export function defaultHistoryProfile(basePath: string): HistoryProfile {
  return {
    id: "Default",
    name: undefined,
    historyDatabasePath: join(basePath, "Default", HISTORY_FILENAME),
  };
}

export function createPhiHistorySource(basePath: string): HistorySource {
  const profiles = loadPhiHistoryProfiles(basePath);
  return {
    basePath,
    profiles:
      profiles.length > 0 ? profiles : [defaultHistoryProfile(basePath)],
  };
}

function escapedLikeTerm(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/[%_]/g, "\\$&");
}

export function buildPhiHistoryQuery(searchText = "", limit = 200): string {
  const terms = searchText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapedLikeTerm);
  const predicates = terms.map(
    (term) =>
      `(url LIKE '%${term}%' ESCAPE '\\' OR title LIKE '%${term}%' ESCAPE '\\')`,
  );
  const conditions = ["hidden = 0", "url <> ''", ...predicates];
  const normalizedLimit = Math.min(
    500,
    Math.max(1, Math.trunc(Number.isFinite(limit) ? limit : 200)),
  );

  return `
    SELECT id,
           url,
           COALESCE(title, '') AS title,
           CAST(
             last_visit_time / 1000 - ${CHROME_EPOCH_OFFSET_MS}
             AS INTEGER
           ) AS lastVisitedAtMs
    FROM urls
    WHERE ${conditions.join(" AND ")}
    ORDER BY last_visit_time DESC
    LIMIT ${normalizedLimit};
  `;
}

export function normalizeHistoryRow(
  row: HistorySqlRow,
  profile: HistoryProfile,
  includeProfileName: boolean,
): HistoryEntry | undefined {
  const lastVisitedAt = new Date(Number(row.lastVisitedAtMs));
  if (
    typeof row.id !== "number" ||
    typeof row.url !== "string" ||
    typeof row.title !== "string" ||
    !Number.isFinite(lastVisitedAt.getTime())
  ) {
    return undefined;
  }

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    lastVisitedAt,
    profileId: profile.id,
    profileName: includeProfileName ? (profile.name ?? profile.id) : undefined,
  };
}
