import { useCallback, useEffect, useState } from "react";
import { Apps } from "../types/type";
import { getAllApps } from "../utils/common-utils";
import { quitApps } from "../utils/applescript-utils";

export const quitAppsHook = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [apps, setApps] = useState<Apps[]>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const allApps = await getAllApps();
    console.debug(allApps);
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
