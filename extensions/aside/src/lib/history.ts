import { existsSync } from "fs";
import { join } from "path";
import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { executeSQL, useSQL } from "@raycast/utils";
import { ASIDE_USER_DATA_DIR, resolveAsideProfile } from "./constants";
import type { HistoryEntry } from "./types";

interface HistoryRow {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
  totalMatches?: number;
}

interface HistoryQueryOptions {
  includeTotalMatches?: boolean;
}

function configuredProfile(): string {
  const { profile } = getPreferenceValues<Preferences>();
  return resolveAsideProfile(profile);
}

function historyDbPath(profile: string): string {
  return join(ASIDE_USER_DATA_DIR, profile, "History");
}

// Chromium stores `last_visit_time` as microseconds since 1601. Convert to ISO-8601 UTC.
const TIME_EXPR =
  "strftime('%Y-%m-%dT%H:%M:%SZ', last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch')";

function buildHistoryQuery(searchText: string, limit: number, options: HistoryQueryOptions = {}): string {
  const terms = searchText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''"));

  const where = terms.length
    ? `WHERE last_visit_time > 0 AND ${terms.map((term) => `(url LIKE '%${term}%' ESCAPE '\\' OR title LIKE '%${term}%' ESCAPE '\\')`).join(" AND ")}`
    : "WHERE last_visit_time > 0";

  const totalMatchesColumn = options.includeTotalMatches ? ", COUNT(*) OVER() AS totalMatches" : "";

  return `
    SELECT id, url, title, ${TIME_EXPR} AS lastVisitedAt${totalMatchesColumn}
    FROM urls
    ${where}
    ORDER BY last_visit_time DESC
    LIMIT ${Math.max(1, Math.floor(limit))};
  `;
}

function mapHistoryRow(row: HistoryRow): HistoryEntry {
  return {
    id: `history-${row.id}`,
    url: row.url,
    title: row.title || row.url,
    lastVisitedAt: row.lastVisitedAt,
  };
}

interface HistorySearchResult {
  totalMatches: number;
  entries: HistoryEntry[];
}

/** Search history without React state or hooks. */
export async function searchHistory(searchText = "", limit = 20): Promise<HistorySearchResult> {
  const profile = configuredProfile();
  const dbPath = historyDbPath(profile);
  if (!existsSync(dbPath)) {
    throw new Error(
      `Aside History is unavailable for profile "${profile}". Check the profile setting and Raycast Full Disk Access.`,
    );
  }

  try {
    const rows = await executeSQL<HistoryRow>(
      dbPath,
      buildHistoryQuery(searchText, Math.min(50, Math.max(1, limit)), { includeTotalMatches: true }),
    );
    return {
      totalMatches: rows[0]?.totalMatches ?? 0,
      entries: rows.map(mapHistoryRow),
    };
  } catch {
    throw new Error(
      `Could not read Aside History for profile "${profile}". Check the profile setting and Raycast Full Disk Access.`,
    );
  }
}

/** Search one Aside profile without an extension-managed history cache. */
export function useHistorySearch(searchText: string, limit = 25, profile = configuredProfile()) {
  const dbPath = historyDbPath(resolveAsideProfile(profile));
  const dbExists = existsSync(dbPath);
  const query = useMemo(() => (dbExists ? buildHistoryQuery(searchText, limit) : ""), [searchText, limit, dbExists]);
  const { data, error, isLoading, permissionView, revalidate } = useSQL<HistoryRow>(
    dbExists ? dbPath : __filename,
    query,
    {
      execute: dbExists,
      permissionPriming: "This is required to search your Aside browser history.",
      failureToastOptions: { title: "Could not search Aside history" },
    },
  );

  const entries = useMemo<HistoryEntry[]>(() => (data ?? []).map(mapHistoryRow), [data]);

  return { data: entries, error, isAvailable: dbExists, isLoading, permissionView, revalidate };
}
