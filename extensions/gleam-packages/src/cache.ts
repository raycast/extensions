import { Cache } from "@raycast/api";

const cache = new Cache();

const key = "lastRefreshAt";

export function getLastRefreshAt(): Date | undefined {
  const cached = cache.get(key);
  return cached ? new Date(cached) : undefined;
}

export function setLastRefreshAt() {
  cache.set(key, new Date().toISOString());
}
