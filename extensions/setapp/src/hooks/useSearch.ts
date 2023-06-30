import { Cache } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { App } from "../types";
import { getApps } from "../refresh-cache";

const cache = new Cache();

export function useSearch(term: string, filter = "all") {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<App[]>([]);

  const searchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let apps = JSON.parse(cache.get("apps") || "[]") as App[];

      // TODO: inform user to enable background refresh
      if (apps.length === 0) {
        apps = await getApps();
      }

      let filteredApps = apps.filter((app) => {
        return app.name.toLowerCase().includes(term.toLowerCase());
      });
      if (filter !== "all") {
        filteredApps = filteredApps.filter((app) => {
          switch (filter) {
            case "installed":
              return app.installed;
            case "not-installed":
              return !app.installed;
            case "mobile-apps":
              return app.type === "mobile_app";
            case "desktop-apps":
              return app.type === "app";
            default:
              return true;
          }
        });
      }
      setData(filteredApps);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [term, filter]);

  useEffect(() => {
    searchData();
  }, [searchData]);

  return { isLoading, data };
}
