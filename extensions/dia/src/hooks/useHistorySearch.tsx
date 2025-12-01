import * as fs from "fs";
import * as api from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState, useEffect } from "react";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../utils";
import { parseSearchQuery } from "../utils/search-parser";
import { getHistoryQuery } from "../utils";
import { List } from "@raycast/api";

function NotInstalledError() {
  return (
    <List>
      <List.EmptyView title="Dia history not found" description="Unable to locate Dia browser history database" />
    </List>
  );
}

/**
 * Hook to search Dia browser history using SQL queries
 */
export function useHistorySearch(query?: string): SearchResult<HistoryEntry> {
  const parsedQuery = parseSearchQuery(query || "");
  const queries = getHistoryQuery("urls", "last_visit_time", parsedQuery.includeTerms, parsedQuery.excludeTerms);
  const dbPath = getHistoryDbPath();

  if (!fs.existsSync(dbPath)) {
    return { isLoading: false, data: [], errorView: <NotInstalledError /> };
  }

  const [retryWaiting, setRetryWaiting] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
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
}
