import os from "node:os";
import { environment } from "@raycast/api";
import type { Cache } from "@raycast/api";
import { CacheEntry, Story } from "./types";

// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
const CACHE_DURATION_IN_MS = 5 * 60 * 1_000;

const cacheKey = "hnrss-newest";

type GetStoriesProps = {
  points: string;
  options: { cache: Cache };
};
export async function getStories(points = "500", { cache }: GetStoriesProps["options"]): Promise<CacheEntry["items"]> {
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    const parsed: CacheEntry = JSON.parse(cachedResponse);
    const elapsed = Date.now() - parsed.timestamp;

    if (elapsed <= CACHE_DURATION_IN_MS) {
      return parsed.items;
    }
  }

  const response = await fetch(`https://hnrss.org/newest.jsonfeed?points=${points}`, {
    headers: {
      "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
    },
  });
  if (!response.ok) {
    console.error("Failed to fetch stories:", response.statusText);
    throw new Error(response.statusText);
  }
  try {
    const { items = [] } = (await response.json()) as { items?: Story[] };
    cache.set(cacheKey, JSON.stringify({ timestamp: Date.now(), items }));
    const now = new Date();
    return items.filter((item: Story) => {
      const publishedDate = new Date(item.date_published);
      const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
      // limit items to a week
      return publishedDate >= oneWeekAgo;
    });
  } catch (error) {
    console.error("Failed to parse response:", error);
    throw new Error("Failed to parse response");
  }
}
