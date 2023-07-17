import { useCallback, useEffect, useState } from "react";
import { Application, environment, getApplications, LaunchType } from "@raycast/api";
import { CacheKey, defaultCache } from "../utils/constants";
import { scriptQuitAppsWithoutWindow } from "../utils/applescript-utils";
import { refreshInterval } from "../types/preferences";

export const setAutoQuitAppsHook = (refresh: number) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [quitApps, setQuitApps] = useState<Application[]>([]);
  const [disQuitApps, setDisQuitApps] = useState<Application[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const allApps = await getApplications();
    const quitAppsString = defaultCache.get(CacheKey.QUIT_APP);
    let quitApps: Application[] = [];
    if (typeof quitAppsString == "string") {
      quitApps = JSON.parse(quitAppsString);
    }
    const disQuitApps = allApps.filter((allApp) => !quitApps.some((quitApp) => allApp.bundleId == quitApp.bundleId));
    setQuitApps(quitApps);
    setDisQuitApps(disQuitApps);
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { quitApps: quitApps, disQuitApps: disQuitApps, loading: loading };
};

export const quitAppsHook = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [quitApps, setQuitApps] = useState<Application[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const quitAppsString = defaultCache.get(CacheKey.QUIT_APP);
    let quitApps: Application[] = [];
    if (typeof quitAppsString == "string") {
      quitApps = JSON.parse(quitAppsString);
    }
    setQuitApps(quitApps);

    // Quit Apps
    if (environment.launchType == LaunchType.Background) {
      const refreshIntervalString = defaultCache.get(CacheKey.REFRESH_INTERVAL);
      let realRefreshInterval = 5;
      if (typeof refreshIntervalString == "string") {
        realRefreshInterval = parseInt(refreshIntervalString);
      }
      if (realRefreshInterval == refreshInterval) {
        await scriptQuitAppsWithoutWindow(quitApps);
        defaultCache.set(CacheKey.REFRESH_INTERVAL, "5");
      } else {
        const nextRefreshInterval = realRefreshInterval + 5;
        if (nextRefreshInterval > refreshInterval) {
          await scriptQuitAppsWithoutWindow(quitApps);
          defaultCache.set(CacheKey.REFRESH_INTERVAL, "5");
        } else {
          defaultCache.set(CacheKey.REFRESH_INTERVAL, String(nextRefreshInterval));
        }
      }
    } else {
      await scriptQuitAppsWithoutWindow(quitApps);
      defaultCache.set(CacheKey.REFRESH_INTERVAL, "5");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { quitApps: quitApps, loading: loading };
};
