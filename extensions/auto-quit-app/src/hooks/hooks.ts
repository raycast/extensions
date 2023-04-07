import { useCallback, useEffect, useState } from "react";
import { App } from "../types/type";
import { getAllApps } from "../utils/common-utils";
import { quitApps } from "../utils/applescript-utils";

export const quitAppsHook = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [apps, setApps] = useState<App[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const allApps = await getAllApps();
    setApps(allApps);
    const enabledApps = allApps.filter((value) => {
      return value.enabled && !value.isActive;
    });
    await quitApps(enabledApps);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { apps: apps, loading: loading };
};
