import { Application, environment, getApplications, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CacheKey, defaultCache } from "../utils/constants";
import { autoQuitApp } from "../utils/common-utils";

export const useAutoQuitApps = (autoQuit: boolean = false) => {
  return useCachedPromise(
    (autoQuit: boolean) => async () => {
      let apps: Application[] = [];
      try {
        const allApps = await getApplications();
        const quitAppsString = defaultCache.get(CacheKey.QUIT_APP);
        if (typeof quitAppsString == "string") {
          const quitApps: Application[] = JSON.parse(quitAppsString);
          // filter app that is installed
          apps = allApps.filter((allApp) => quitApps.some((quitApp) => allApp.bundleId == quitApp.bundleId));
          // cache new data
          defaultCache.set(CacheKey.QUIT_APP, JSON.stringify(apps));

          // ✨Quit Apps automatically while in the background
          if (autoQuit && environment.launchType == LaunchType.Background) {
            await autoQuitApp(apps);
          }
        }
      } catch (e) {
        console.error(e);
      }
      return { data: apps };
    },
    [autoQuit],
  );
};
