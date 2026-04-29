import * as fs from "fs";
import * as api from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { handleErrorToastAction } from "../util/handleErrorToastAction";
import { useState, useEffect } from "react";
import { createHash } from "crypto";
import os from "os";
import path from "path";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { NotInstalledError } from "../components";
import { parseSearchQuery } from "../util/search-parser";

const whereClauses = (tableTitle: string, includeTerms: string[], excludeTerms: string[]) => {
  // Escape single quotes to prevent SQL injection
  const escapeSql = (str: string) => str.replace(/'/g, "''");
  const includeClauses = includeTerms.map(
    (t) => `(${tableTitle}.title LIKE '%${escapeSql(t)}%' OR ${tableTitle}.url LIKE '%${escapeSql(t)}%')`,
  );
  const excludeClauses = excludeTerms.map(
    (t) => `NOT (${tableTitle}.title LIKE '%${escapeSql(t)}%' OR ${tableTitle}.url LIKE '%${escapeSql(t)}%')`,
  );

  const allClauses = [...includeClauses, ...excludeClauses];
  return allClauses.length > 0 ? allClauses.join(" AND ") : "1=1";
};

/**
 * Generates a query to search the history for a list of terms.
 * Supports both include and exclude terms.
 *
 * Using `last_visit_time > 0` to filter out bookmarks.
 */
const getHistoryQuery = (table: string, date_field: string, includeTerms: string[], excludeTerms: string[]) =>
  `SELECT id,
            url,
            title,
            datetime(${date_field} /
                     1000000 +
                     (strftime('%s', '1601-01-01')),
                     'unixepoch',
                     'localtime') as lastVisited
      FROM ${table}
      WHERE ${whereClauses(table, includeTerms, excludeTerms)}
      AND last_visit_time > 0
      ORDER BY ${date_field} DESC LIMIT 30;`;

const getHistorySnapshotPath = () => path.join(os.tmpdir(), "raycast-google-chrome-history.sqlite");
const getPlaceholderDbPath = () => path.join(api.environment.assetsPath, "history-placeholder.sqlite");

const hashFile = (filePath: string) => {
  try {
    const content = fs.readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
};

const ensureHistorySnapshot = (sourcePath: string, snapshotPath: string) => {
  try {
    const sourceHash = hashFile(sourcePath);
    const snapshotHash = fs.existsSync(snapshotPath) ? hashFile(snapshotPath) : null;

    if (sourceHash && snapshotHash && sourceHash === snapshotHash) {
      return snapshotPath;
    }

    fs.copyFileSync(sourcePath, snapshotPath);
    return snapshotPath;
  } catch {
    return null;
  }
};

export function useHistorySearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const parsedQuery = parseSearchQuery(query || "");
  const queries = getHistoryQuery("urls", "last_visit_time", parsedQuery.includeTerms, parsedQuery.excludeTerms);
  const dbPath = getHistoryDbPath(profile);
  const placeholderDbPath = getPlaceholderDbPath();

  const [snapshotVer, setSnapshotVer] = useState(0);
  const [snapshotPath, setSnapshotPath] = useState<string | null>(null);
  useEffect(() => {
    const nextSnapshotPath = ensureHistorySnapshot(dbPath, getHistorySnapshotPath());
    if (nextSnapshotPath) {
      setSnapshotPath(nextSnapshotPath);
    }
  }, [dbPath, snapshotVer]);

  const [retryWaiting, setRetryWaiting] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [retryTimer]);

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(
    snapshotPath || placeholderDbPath,
    queries as unknown as string,
    {
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
      execute: snapshotPath != null,
    },
  );

  const customRevalidate = () => {
    revalidate();
    setSnapshotVer((cur) => cur + 1);
  };

  if (!fs.existsSync(dbPath)) {
    return { isLoading: false, data: [], errorView: <NotInstalledError /> };
  }

  if (!snapshotPath) {
    return { isLoading: true, data: [], revalidate };
  }

  return {
    data,
    isLoading: isLoading || retryWaiting,
    errorView: permissionView,
    revalidate: customRevalidate,
  };
}
