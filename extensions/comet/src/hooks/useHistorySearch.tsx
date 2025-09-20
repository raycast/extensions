import * as fs from "fs";
import { execSync } from "child_process";
import * as api from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { handleErrorToastAction } from "@raycast/utils/dist/handle-error-toast-action";
import { useState, useEffect, useMemo } from "react";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath, getHistoryQuery } from "../util";
import { useCometInstallation } from "./useCometInstallation";

// Create empty SQLite database once at module load to avoid hook violations
const EMPTY_DB_PATH = "/tmp/comet-raycast-empty.db";

const ensureEmptyDbExists = () => {
  if (!fs.existsSync(EMPTY_DB_PATH)) {
    try {
      execSync(
        `sqlite3 "${EMPTY_DB_PATH}" "CREATE TABLE IF NOT EXISTS urls (id TEXT, url TEXT, title TEXT, last_visit_time INTEGER);"`
      );
    } catch (error) {
      // Fallback: create empty file
      fs.writeFileSync(EMPTY_DB_PATH, "");
    }
  }
};

// Ensure empty DB exists when module loads
ensureEmptyDbExists();

const searchHistory = (profile: string, query?: string, enabled = true): SearchResult<HistoryEntry> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("urls", "last_visit_time", terms);
  const dbPath = getHistoryDbPath(profile);

  // All hooks must be called at the top level
  const { isInstalled, isChecking } = useCometInstallation();
  const [retryWaiting, setRetryWaiting] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      retryTimer && clearTimeout(retryTimer);
    };
  }, [retryTimer]);

  // Always call useSQL to respect hooks rules, but conditionally use its results
  // Use useMemo to stabilize path calculation and avoid hook order changes
  const sqlPath = useMemo(() => {
    if (!enabled) return EMPTY_DB_PATH;
    const dbExists = fs.existsSync(dbPath);
    return dbExists ? dbPath : EMPTY_DB_PATH;
  }, [enabled, dbPath]);
  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(sqlPath, queries as unknown as string, {
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

  // Handle conditions after hooks are called
  // If disabled, return empty data after all hooks have been called
  if (!enabled) {
    return {
      data: [],
      isLoading: false,
      errorView: undefined,
      revalidate: () => {
        // no-op: revalidate is disabled when not enabled
      },
    };
  }

  if (isChecking) {
    return { isLoading: true, data: [], errorView: undefined, revalidate };
  }

  if (!isInstalled) {
    return { isLoading: false, data: [], errorView: undefined, revalidate };
  }

  if (sqlPath === EMPTY_DB_PATH && enabled) {
    return {
      isLoading: false,
      data: [],
      errorView: undefined,
      revalidate,
    };
  }

  return {
    data: data || [],
    isLoading: isLoading || retryWaiting,
    errorView: permissionView,
    revalidate,
  };
};

export function useHistorySearch(profile: string, query?: string, enabled = true): SearchResult<HistoryEntry> {
  return searchHistory(profile, query, enabled);
}
