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
    try {
      const parsed: CacheEntry = JSON.parse(cachedResponse);
      const elapsed = Date.now() - parsed.timestamp;

      if (elapsed <= CACHE_DURATION_IN_MS) {
        return parsed.items;
      }
    } catch (error) {
      console.error("Failed to parse cached response:", error);
      // Clear invalid cache
      cache.remove(cacheKey);
    }
  }

  try {
    const response = await fetch(`https://hnrss.org/newest.jsonfeed?points=${points}`, {
      headers: {
        "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
      },
    });
    if (!response.ok) {
      console.error("Failed to fetch stories:", response.statusText);
      throw new Error(response.statusText);
    }

    const data = (await response.json()) as { items?: Story[] };
    if (!data || !data.items) {
      console.warn("No stories found in response");
      return [];
    }

    const { items = [] } = data;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const filteredItems = items.filter((item: Story) => {
      try {
        if (!item.date_published) return false;
        const publishedDate = new Date(item.date_published);
        return publishedDate >= oneWeekAgo;
      } catch (error) {
        console.warn("Failed to parse date for item:", item.id, error);
        return false;
      }
    });

    cache.set(cacheKey, JSON.stringify({ timestamp: Date.now(), items: filteredItems }));
    return filteredItems;
  } catch (error) {
    console.error("Failed to fetch or parse stories:", error);
    return [];
  }
}
