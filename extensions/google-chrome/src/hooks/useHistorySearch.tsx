import * as fs from "fs";
import * as api from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { handleErrorToastAction } from "@raycast/utils/dist/handle-error-toast-action";
import { useState, useEffect } from "react";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { NotInstalledError } from "../components";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `(${tableTitle}.title LIKE '%${t}%' OR ${tableTitle}.url LIKE '%${t}%')`).join(" AND ");
};

/**
 * Generates a query to search the history for a list of terms.
 *
 * Using `last_visit_time > 0` to filter out bookmarks.
 */
const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            url,
            title,
            datetime(${date_field} /
                     1000000 +
                     (strftime('%s', '1601-01-01')),
                     'unixepoch',
                     'localtime') as lastVisited
     FROM ${table}
     WHERE ${whereClauses(table, terms)}
     AND last_visit_time > 0
     ORDER BY ${date_field} DESC LIMIT 30;`;

const searchHistory = (profile: string, query?: string): SearchResult<HistoryEntry> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("urls", "last_visit_time", terms);
  const dbPath = getHistoryDbPath(profile);

  if (!fs.existsSync(dbPath)) {
    return { isLoading: false, data: [], errorView: <NotInstalledError /> };
  }

  const [retryWaiting, setRetryWaiting] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      retryTimer && clearTimeout(retryTimer);
    };
  }, [retryTimer]);

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, queries as unknown as string, {
    onData() {
      setRetryWaiting(false);
      setRetryTimes(0);
      setRetryTimer(null);
    },
    onError(error) {
      // In rare cases, we encounter the SQLite error "database disk image is malformed (11)",
      // and manual retries can resolve the issue.
      // We implement an automatic retry here.
      if (retryTimes < 1) {
        setRetryWaiting(true);
        setRetryTimes(retryTimes + 1);
        const timer = setTimeout(() => {
          revalidate();
          clearTimeout(timer);
        }, 1000);
        setRetryTimer(timer);
      } else {
        setRetryWaiting(false);
        setRetryTimes(0);
        setRetryTimer(null);
        // Default error handling copied from useSQL
        if (api.environment.launchType !== api.LaunchType.Background) {
          api.showToast({
            style: api.Toast.Style.Failure,
            title: "Failed to load history",
            message: error.message,
            primaryAction: handleErrorToastAction(error),
          });
        }
      }
    },
  });
  return {
    data,
    isLoading: isLoading || retryWaiting,
    errorView: permissionView,
    revalidate,
  };
};

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  return searchHistory(profile, query);
}
