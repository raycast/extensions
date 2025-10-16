import { refreshInterval } from "../types/preferences";
import { Cache } from "@raycast/api";

const cache = new Cache();
const ONE_MINUTE = 60 * 1000;
const KEY_LAST_REFRESH = "lastRefresh";

export function canRefresh(): boolean {
  const currentTime = Date.now();
  const lastRefresh = parseInt(cache.get(KEY_LAST_REFRESH) || "0");
  return currentTime - lastRefresh >= parseInt(refreshInterval) * ONE_MINUTE;
}

export function recordRefresh(): void {
  const currentTime = Date.now();
  cache.set(KEY_LAST_REFRESH, currentTime.toString());
}
