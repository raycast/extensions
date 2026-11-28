import os from "node:os";
import { Cache, environment } from "@raycast/api";
import Parser from "rss-parser";
import { CacheEntry, Topic } from "./types";

// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
const CACHE_DURATION_IN_MS = 5 * 60 * 1_000;

const USER_AGENT = `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`;

const cache = new Cache();
const parser = new Parser({
  headers: {
    "User-Agent": USER_AGENT,
  },
});

// Maps story ID to its position on the HN front page.
async function getFrontPageRanking() {
  const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch front page ranking: ${response.status}`);
  }
  const ids = (await response.json()) as number[];
  return new Map(ids.map((id, index) => [String(id), index]));
}

// hnrss returns front page stories newest-first, so re-sort them into HN's actual ranking.
// Stories missing from the ranking (e.g. while hnrss's cache is stale) go to the end.
function sortByRanking(items: Parser.Item[], ranking: Map<string, number>) {
  const rankOf = (item: Parser.Item) => {
    const id = item.guid?.match(/id=(\d+)/)?.[1];
    return (id ? ranking.get(id) : undefined) ?? Number.MAX_SAFE_INTEGER;
  };
  return [...items].sort((a, b) => rankOf(a) - rankOf(b));
}

export async function getStories(topic: Topic | null) {
  if (!topic) {
    return [];
  }

  const cachedResponse = cache.get(topic);
  if (cachedResponse) {
    const parsed: CacheEntry = JSON.parse(cachedResponse);

    const elapsed = Date.now() - parsed.timestamp;
    console.log(`${topic} cache age: ${elapsed / 1000} seconds`);

    if (elapsed <= CACHE_DURATION_IN_MS) {
      return parsed.items;
    } else {
      console.log(`Cache expired for ${topic}`);
    }
  }

  const [feed, ranking] = await Promise.all([
    parser.parseURL(`https://hnrss.org/${topic}?count=30`),
    // If the ranking can't be fetched, fall back to the hnrss order rather than failing.
    topic === Topic.FrontPage ? getFrontPageRanking().catch(() => null) : null,
  ]);
  const items = ranking ? sortByRanking(feed.items, ranking) : feed.items;
  cache.set(topic, JSON.stringify({ timestamp: Date.now(), items }));

  return items;
}
