import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { HistoryEntry, HistoryQueryFunction, SearchResult, SupportedBrowsers } from "../interfaces";
import { getHistoryDateColumn, getHistoryDbPath, getHistoryTable } from "../util";
import { NotInstalledError } from "../components";

const whereClauses = (tableTitle: string, terms: string[], tableUrl?: string) => {
  const urlTable = tableUrl || tableTitle;
  return (
    "(" +
    terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ") +
    ") OR (" +
    terms.map((t) => `${urlTable}.url LIKE '%${t}%'`).join(" AND ") +
    ")"
  );
};

const getWebKitHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT history_items.id as id, url, history_visits.title as title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
    INNER JOIN history_visits
    ON history_visits.history_item = history_items.id
  WHERE ${whereClauses("history_visits", terms, "history_items")}
  GROUP BY url
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;

const getOrionHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT ID as id, URL as url, TITLE as title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;

const getChromiumGeckoHistoryQuery = (table: string, date_field: string, terms: string[]) => `SELECT
    id, url, title,
    datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC LIMIT 30;`;

const getHistoryQuery = (browser: SupportedBrowsers): HistoryQueryFunction => {
  switch (browser) {
    case SupportedBrowsers.Safari:
      return getWebKitHistoryQuery;
    case SupportedBrowsers.Orion:
      return getOrionHistoryQuery;
    default:
      return getChromiumGeckoHistoryQuery;
  }
};

const searchHistory = (
  browser: SupportedBrowsers,
  table: string,
  date_field: string,
  queryBuilder: (table: string, date_field: string, terms: string[]) => string,
  query?: string
): SearchResult => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = queryBuilder(table, date_field, terms);
  const dbPath = getHistoryDbPath(browser);

  if (!existsSync(dbPath)) {
    return {
      browser,
      data: [],
      isLoading: false,
      permissionView: <NotInstalledError browser={browser} />,
    };
  }

  const { data, isLoading, permissionView } = useSQL<HistoryEntry>(dbPath, queries);
  return {
    browser,
    data: data?.map((d) => ({ ...d, id: `${browser}-${d.id}`, browser: browser })),
    isLoading,
    permissionView,
  };
};

export function useHistorySearch(browser: SupportedBrowsers, query: string | undefined): SearchResult {
  return searchHistory(
    browser,
    getHistoryTable(browser),
    getHistoryDateColumn(browser),
    getHistoryQuery(browser),
    query
  );
}
