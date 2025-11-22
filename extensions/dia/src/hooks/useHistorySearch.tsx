import fs from "fs";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import { useSQL } from "@raycast/utils";
import { NO_HISTORY_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryFilePath } from "../util";
import { parseSearchQuery } from "../util/search-parser";

type RawHistoryRow = {
  id: string;
  url: string;
  title: string;
  lastVisitedMs: number;
};

const HISTORY_LIMIT = 100;

const escapeSqlTerm = (term: string) => term.replace(/'/g, "''");

const buildHistoryQuery = (query?: string) => {
  const parsed = parseSearchQuery(query ?? "");
  const baseFilters = ["url IS NOT NULL", "url != ''"];

  const includeClauses = parsed.includeTerms.map((term) => {
    const safeTerm = escapeSqlTerm(term);
    return `(LOWER(title) LIKE '%${safeTerm}%' OR LOWER(url) LIKE '%${safeTerm}%')`;
  });

  const excludeClauses = parsed.excludeTerms.map((term) => {
    const safeTerm = escapeSqlTerm(term);
    return `(LOWER(title) NOT LIKE '%${safeTerm}%' AND LOWER(url) NOT LIKE '%${safeTerm}%')`;
  });

  const filters = [...baseFilters, ...includeClauses, ...excludeClauses];
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  return `
    SELECT id, url, title, (last_visit_time / 1000 - 11644473600000) AS lastVisitedMs
    FROM urls
    ${whereClause}
    ORDER BY last_visit_time DESC
    LIMIT ${HISTORY_LIMIT}
  `;
};

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const [error, setError] = useState<string>();
  const historyFilePath = useMemo(() => getHistoryFilePath(profile), [profile]);
  const sqlQuery = useMemo(() => buildHistoryQuery(query), [query]);
  const hasQuery = Boolean(query?.trim());

  useEffect(() => {
    setError(undefined);
  }, [historyFilePath, sqlQuery]);

  if (!fs.existsSync(historyFilePath)) {
    const historyDirectory = path.dirname(historyFilePath);
    const message = fs.existsSync(historyDirectory) ? NO_HISTORY_MESSAGE : NOT_INSTALLED_MESSAGE;
    return { isLoading: false, data: [], error: message };
  }

  const { data, isLoading, revalidate, permissionView } = useSQL<RawHistoryRow>(historyFilePath, sqlQuery, {
    onError(err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load history.");
      }
    },
  });

  const historyEntries =
    data?.map((row) => {
      const lastVisitedMs = Number(row.lastVisitedMs);
      return {
        id: String(row.id),
        url: row.url,
        title: row.title || row.url,
        lastVisited: Number.isFinite(lastVisitedMs) ? new Date(lastVisitedMs) : new Date(0),
      };
    }) ?? [];

  const noResults = !isLoading && historyEntries.length === 0;
  const errorMessage = error ?? (!hasQuery && noResults ? NO_HISTORY_MESSAGE : undefined);

  return {
    isLoading,
    data: historyEntries,
    error: errorMessage,
    revalidate,
    permissionView,
  };
}
