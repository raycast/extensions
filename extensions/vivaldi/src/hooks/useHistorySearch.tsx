import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { NotInstalledError } from "../components";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ");
};

const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            url,
            title,
            datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
     FROM ${table}
     WHERE ${whereClauses(table, terms)}
     ORDER BY ${date_field} DESC LIMIT 30;`;

const searchHistory = (profile: string, query?: string): SearchResult<HistoryEntry> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("urls", "last_visit_time", terms);
  const dbPath = getHistoryDbPath(profile);

  if (!existsSync(dbPath)) {
    return { isLoading: false, data: [], errorView: <NotInstalledError /> };
  }

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, queries);
  return {
    data,
    isLoading,
    errorView: permissionView,
    revalidate,
  };
};

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  return searchHistory(profile, query);
}
