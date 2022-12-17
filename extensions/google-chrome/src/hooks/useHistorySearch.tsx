import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { useSQL } from "@raycast/utils";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ");
};

const getHistoryQuery = (table: string, date_field: string, terms: string[]) => `SELECT
    id, url, title,
    datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC LIMIT 30;`;

const searchHistory = (query?: string): SearchResult => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("urls", "last_visit_time", terms);
  const dbPath = getHistoryDbPath();
  const { data, isLoading, permissionView } = useSQL<HistoryEntry>(dbPath, queries);
  return {
    data,
    isLoading,
    permissionView,
  };
};

export function useHistorySearch(query: string | undefined): SearchResult {
  return searchHistory(query);
}
