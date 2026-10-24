import { showError } from "@chrismessina/raycast-kit";
import { existsSync } from "fs";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { useSQL } from "@raycast/utils";

// useSQL validates its database path even when execution is disabled. The
// bundled command file is a safe existing path to pass while no History
// database is available; execute: false ensures it is never queried.
const FALLBACK_DATABASE_PATH = __filename;

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms
    .map((term) => {
      const t = term.replace(/'/g, "''");
      return `(${tableTitle}.title LIKE '%${t}%' OR ${tableTitle}.url LIKE '%${t}%')`;
    })
    .join(" AND ");
};

const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            url,
             title,
             datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
      FROM ${table}
      WHERE ${whereClauses(table, terms)}
      ORDER BY ${date_field} DESC LIMIT 100;`;

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const historyPath = getHistoryDbPath(profile);
  const hasHistory = existsSync(historyPath);
  const terms = query?.trim().split(/\s+/) ?? [""];
  const historyQuery = getHistoryQuery("urls", "last_visit_time", terms);
  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(
    hasHistory ? historyPath : FALLBACK_DATABASE_PATH,
    historyQuery,
    {
      execute: hasHistory,
      onError: (error) => {
        void showError(error, { title: "Could Not Search History" });
      },
    },
  );

  return {
    data,
    isLoading: hasHistory && isLoading,
    errorView: permissionView,
    revalidate,
    profile: { id: profile, name: profile },
  };
}
