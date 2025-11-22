import fs from "fs";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import { useSQL } from "@raycast/utils";
import { NO_HISTORY_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryFilePath } from "../util";
import { matchesQuery, parseSearchQuery } from "../util/search-parser";

type RawHistoryRow = {
  id: string;
  url: string;
  title: string;
  lastVisitedMs: number;
};

const HISTORY_LIMIT = 100;

const HISTORY_QUERY = `
  SELECT id, url, title, (last_visit_time / 1000 - 11644473600000) AS lastVisitedMs
  FROM urls
  WHERE url IS NOT NULL AND url != ''
  ORDER BY last_visit_time DESC
  LIMIT ${HISTORY_LIMIT}
`;

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const [error, setError] = useState<string>();
  const historyFilePath = useMemo(() => getHistoryFilePath(profile), [profile]);
  const parsedQuery = useMemo(() => parseSearchQuery(query ?? ""), [query]);
  const hasQuery = parsedQuery.includeTerms.length > 0 || parsedQuery.excludeTerms.length > 0;

  useEffect(() => {
    setError(undefined);
  }, [historyFilePath]);

  if (!fs.existsSync(historyFilePath)) {
    const historyDirectory = path.dirname(historyFilePath);
    const message = fs.existsSync(historyDirectory) ? NO_HISTORY_MESSAGE : NOT_INSTALLED_MESSAGE;
    return { isLoading: false, data: [], error: message };
  }

  const { data, isLoading, revalidate, permissionView } = useSQL<RawHistoryRow>(historyFilePath, HISTORY_QUERY, {
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
      const entry: HistoryEntry = {
        id: String(row.id),
        url: row.url,
        title: row.title || row.url,
        lastVisited: Number.isFinite(lastVisitedMs) ? new Date(lastVisitedMs) : new Date(0),
      };

      if (!hasQuery) {
        return entry;
      }

      const searchableText = `${entry.title.toLowerCase()} ${entry.url.toLowerCase()}`;
      return matchesQuery(searchableText, parsedQuery) ? entry : undefined;
    }) ?? [];

  const filteredEntries = historyEntries.filter(Boolean) as HistoryEntry[];

  const noResults = !isLoading && filteredEntries.length === 0;
  const errorMessage = error ?? (!hasQuery && noResults ? NO_HISTORY_MESSAGE : undefined);

  return {
    isLoading,
    data: filteredEntries,
    error: errorMessage,
    revalidate,
    permissionView,
  };
}
