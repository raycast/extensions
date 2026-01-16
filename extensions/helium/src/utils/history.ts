import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { useMemo } from "react";

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  lastVisitedAt: string;
}

interface HistorySqlRow {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
}

const HISTORY_FILENAME = "History";
const HELIUM_BASE_PATH = join(homedir(), "Library", "Application Support", "net.imput.helium");

/**
 * Get the path to Helium's history database
 */
function getHistoryDatabasePath(): string {
  return join(HELIUM_BASE_PATH, "Default", HISTORY_FILENAME);
}

/**
 * Get a query to retrieve the most recent history entries (for testing/debugging)
 */
function getRecentHistoryQuery(limit = 10): string {
  return `
    SELECT
      id,
      url,
      title,
      datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    ORDER BY last_visit_time DESC
    LIMIT ${limit};
  `;
}

/**
 * Generate SQL query for history search with lenient substring matching
 * Each space-separated term is treated as an AND condition
 * Searches are case-insensitive via SQLite LIKE
 */
function getHistoryQuery(searchText: string, limit = 25): string {
  const terms = searchText
    .trim()
    .split(/\s+/) // Split on any whitespace
    .filter((word) => word.length > 0)
    .map((term) => term.replace(/'/g, "''")); // Escape single quotes for SQL

  let whereClause = "";
  if (terms.length > 0) {
    // Each term must appear in either URL or title (AND logic)
    const conditions = terms.map((term) => `(url LIKE '%${term}%' OR title LIKE '%${term}%')`).join(" AND ");
    whereClause = `WHERE ${conditions}`;
  }

  const query = `
    SELECT
      id,
      url,
      title,
      datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    ${whereClause}
    GROUP BY url
    ORDER BY last_visit_time DESC
    LIMIT ${limit};
  `;

  return query;
}

/**
 * Hook to search browsing history
 */
export function useHistorySearch(searchText: string, limit = 25) {
  const historyDbPath = getHistoryDatabasePath();
  const dbExists = existsSync(historyDbPath);

  const query = useMemo(() => {
    if (!dbExists) {
      return "";
    }

    // If no search text, show recent history for debugging
    if (!searchText || searchText.trim().length === 0) {
      return getRecentHistoryQuery(limit);
    }

    return getHistoryQuery(searchText, limit);
  }, [searchText, limit, dbExists]);

  const { data, isLoading, permissionView } = useSQL<HistorySqlRow>(dbExists ? historyDbPath : "", query);

  const restructuredData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.map((row) => ({
      id: `history-${row.id}`,
      url: row.url,
      title: row.title || row.url,
      lastVisitedAt: row.lastVisitedAt,
    }));
  }, [data]);

  return {
    data: restructuredData,
    isLoading,
    permissionView,
  };
}
