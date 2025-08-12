import * as fs from "fs";
import * as api from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { handleErrorToastAction } from "@raycast/utils/dist/handle-error-toast-action";
import { useState, useEffect } from "react";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath, checkCometInstallation, getHistoryQuery } from "../util";
import { NotInstalledError } from "../components";

const searchHistory = (profile: string, query?: string): SearchResult<HistoryEntry> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("urls", "last_visit_time", terms);
  const dbPath = getHistoryDbPath(profile);

  // All hooks must be called at the top level
  const [installationChecked, setInstallationChecked] = useState(false);
  const [shouldShowData, setShouldShowData] = useState(true);
  const [retryWaiting, setRetryWaiting] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkInstallation = async () => {
      const isInstalled = await checkCometInstallation();
      if (!isInstalled) {
        setShouldShowData(false);
      }
      setInstallationChecked(true);
    };
    checkInstallation();
  }, []);

  useEffect(() => {
    return () => {
      retryTimer && clearTimeout(retryTimer);
    };
  }, [retryTimer]);

  // Always call useSQL to respect hooks rules, but conditionally use its results
  const dbExists = fs.existsSync(dbPath);
  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(
    dbExists ? dbPath : "",
    dbExists ? (queries as unknown as string) : "",
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
    }
  );

  // Handle conditions after hooks are called
  if (!installationChecked) {
    return { isLoading: true, data: [], errorView: undefined, revalidate };
  }

  if (!shouldShowData) {
    return { isLoading: false, data: [], errorView: undefined, revalidate };
  }

  if (!dbExists) {
    return { isLoading: false, data: [], errorView: <NotInstalledError />, revalidate };
  }

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
