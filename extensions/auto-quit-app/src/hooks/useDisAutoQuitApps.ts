import { Application, getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CacheKey, defaultCache } from "../utils/constants";

export const useDisAutoQuitApps = () => {
  return useCachedPromise(
    () => async () => {
      let apps: Application[] = [];
      try {
        const allApps = await getApplications();
        const quitAppsString = defaultCache.get(CacheKey.QUIT_APP);
        if (typeof quitAppsString == "string") {
          const quitApps: Application[] = JSON.parse(quitAppsString);
          // filter app that is installed
          apps = allApps.filter((allApp) => !quitApps.some((quitApp) => allApp.bundleId == quitApp.bundleId));
        } else {
          apps = allApps;
        }
      } catch (e) {
        console.error(e);
      }
      return { data: apps };
    },
    [],
  );
};
