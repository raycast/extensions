import { Application } from "@raycast/api";
import { CacheKey, defaultCache } from "./constants";
import { refreshInterval } from "../types/preferences";
import { scriptQuitAppsWithoutWindow } from "./applescript-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export async function autoQuitApp(apps: Application[]) {
  if (apps.length == 0) {
    return;
  }
  const lastRefreshTimeString = defaultCache.get(CacheKey.LAST_BACKGROUND_REFRESH_TIME);
  let lastRefreshTime = 0;
  if (typeof lastRefreshTimeString == "string") {
    lastRefreshTime = parseInt(lastRefreshTimeString);
  }
  const currentTime = new Date().getTime();
  if (currentTime - lastRefreshTime > parseInt(refreshInterval) * 60 * 1000) {
    defaultCache.set(CacheKey.LAST_BACKGROUND_REFRESH_TIME, String(currentTime));
    await scriptQuitAppsWithoutWindow(apps);
  }
}
