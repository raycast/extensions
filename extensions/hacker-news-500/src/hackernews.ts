import os from "node:os";
import { Cache, environment } from "@raycast/api";
import { CacheEntry } from "./types";

// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
const CACHE_DURATION_IN_MS = 5 * 60 * 1_000;

const cache = new Cache();
const key = "hnrss-newest";

export async function getStories(): Promise<CacheEntry["items"]> {
  const cachedResponse = cache.get(key);
  if (cachedResponse) {
    const parsed: CacheEntry = JSON.parse(cachedResponse);
    const elapsed = Date.now() - parsed.timestamp;

    if (elapsed <= CACHE_DURATION_IN_MS) {
      return parsed.items;
    }
  }

  const response = await fetch(`https://hnrss.org/newest.jsonfeed?points=500`, {
    headers: {
      "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
    },
  });
  const { items } = await response.json();
  cache.set(key, JSON.stringify({ timestamp: Date.now(), items }));

  return items;
}
