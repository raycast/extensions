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
  "strftime('%Y-%m-%dT%H:%M:%SZ', visible_history.last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch')";

function buildHistoryQuery(searchText: string, limit: number, options: HistoryQueryOptions = {}): string {
  const terms = searchText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''"));

  const searchPredicate = terms.length
    ? terms
        .map(
          (term) =>
            `(visible_history.url LIKE '%${term}%' ESCAPE '\\' OR visible_history.title LIKE '%${term}%' ESCAPE '\\')`,
        )
        .join(" AND ")
    : "1";

  const totalMatchesColumn = options.includeTotalMatches ? ", COUNT(*) OVER() AS totalMatches" : "";

  // Redirect hops share a timestamp. Keep only final destinations, while preserving URLs
  // without a matching local visit and unrelated navigations that share a title or time.
  return `
    WITH canonical_visits AS MATERIALIZED (
      SELECT urls.id,
            urls.url,
            urls.title,
            urls.last_visit_time,
            current_visit.id AS visit_id,
            current_visit.from_visit,
            current_visit.transition
      FROM urls
      LEFT JOIN visits AS current_visit
        ON current_visit.id = (
          SELECT MAX(candidate.id)
          FROM visits AS candidate
          WHERE candidate.url = urls.id
            AND candidate.visit_time = urls.last_visit_time
        )
      WHERE urls.last_visit_time > 0
    ),
    visible_history AS (
      SELECT current.id, current.url, current.title, current.last_visit_time, current.visit_id
      FROM canonical_visits AS current
      WHERE current.visit_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM canonical_visits AS child
          WHERE child.from_visit = current.visit_id
            AND child.last_visit_time = current.last_visit_time
            AND (child.transition & 0xC0000000) != 0
        )
    )
    SELECT id, url, title, ${TIME_EXPR} AS lastVisitedAt${totalMatchesColumn}
    FROM visible_history
    WHERE ${searchPredicate}
    ORDER BY visible_history.last_visit_time DESC,
            visible_history.visit_id DESC,
            visible_history.id DESC
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
export function useHistorySearch(
  searchText: string,
  limit = 25,
  profile = configuredProfile(),
  options: HistoryQueryOptions = {},
) {
  const dbPath = historyDbPath(resolveAsideProfile(profile));
  const dbExists = existsSync(dbPath);
  const query = useMemo(
    () => (dbExists ? buildHistoryQuery(searchText, limit, options) : ""),
    [searchText, limit, dbExists, options.includeTotalMatches],
  );
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
  const totalMatches = data?.[0]?.totalMatches ?? entries.length;

  return { data: entries, totalMatches, error, isAvailable: dbExists, isLoading, permissionView, revalidate };
}
