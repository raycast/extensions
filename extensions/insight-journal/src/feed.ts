import { Cache, LocalStorage } from "@raycast/api";
import Parser from "rss-parser";

export const FEED_URL = "https://www.aryantechie.com/api/rss";
export const BLOG_URL = "https://aryantechie.com/blog";
export const WORK_URL = "https://aryantechie.com/work";

// Each post gets its own storage key, so commands running at the same time
// (for example the menu bar and a search window) never overwrite each other.
const SEEN_INITIALIZED_KEY = "seen-initialized";
const SEEN_PREFIX = "seen:";
const NOTIFIED_PREFIX = "notified:";
const SAVED_PREFIX = "saved:";

const SITE_HOSTS = ["aryantechie.com", "www.aryantechie.com"];

export type EntryKind = "post" | "project";

/** A blog post (`/blog/…`) or a project write-up (`/work/…`) from the feed. */
export interface Entry {
  id: string;
  kind: EntryKind;
  title: string;
  url: string;
  summary: string;
  excerpt: string;
  coverImage?: string;
  /** Topics for posts, tech stack for projects. */
  categories: string[];
  date?: Date;
}

type FeedCategory = string | { _: string };
type FeedItem = { categories?: FeedCategory[]; "content:encoded"?: string };

const parser = new Parser<object, FeedItem>();

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Pulls the plain-text opening paragraphs out of the `content:encoded` HTML.
 * Project write-ups start with MDX `<Tag label="…" />` components, which are
 * returned separately as the tech stack.
 */
function extractBody(html?: string): { excerpt: string; tags: string[] } {
  const match = html?.match(/<div>([\s\S]*?)<\/div>/);
  if (!match) {
    return { excerpt: "", tags: [] };
  }
  const text = decodeEntities(match[1]);
  const tags = [...text.matchAll(/<Tag\b[^>]*\blabel="([^"]+)"/g)].map((tag) => tag[1]);
  const excerpt = text
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
  return { excerpt, tags };
}

/** Only accepts https links on aryantechie.com, since post pages are fetched automatically. */
function kindOf(link?: string): EntryKind | undefined {
  let url: URL;
  try {
    url = new URL(link ?? "");
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || !SITE_HOSTS.includes(url.hostname)) return undefined;
  if (url.pathname.startsWith("/blog/")) return "post";
  if (url.pathname.startsWith("/work/")) return "project";
  return undefined;
}

/** Fetches the RSS feed and returns every post and project, newest first. */
export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }
  const feed = await parser.parseString(await response.text());

  return feed.items
    .flatMap((item): Entry[] => {
      const kind = kindOf(item.link);
      if (!kind) {
        return [];
      }
      const { excerpt, tags } = extractBody(item["content:encoded"]);
      const feedCategories = (item.categories ?? [])
        .map((category) => (typeof category === "string" ? category : category._))
        .filter((category) => category && !["blog", "work"].includes(category.toLowerCase()));

      return [
        {
          id: item.guid ?? item.link ?? item.title ?? "",
          kind,
          title: decodeEntities(item.title ?? "Untitled"),
          url: item.link ?? (kind === "post" ? BLOG_URL : WORK_URL),
          summary: decodeEntities(item.contentSnippet ?? item.content ?? ""),
          excerpt,
          coverImage: item.enclosure?.url,
          categories: [...new Set([...feedCategories, ...tags])],
          date: item.isoDate ? new Date(item.isoDate) : undefined,
        },
      ];
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

export async function fetchPosts(): Promise<Entry[]> {
  return (await fetchEntries()).filter((entry) => entry.kind === "post");
}

export async function fetchProjects(): Promise<Entry[]> {
  return (await fetchEntries()).filter((entry) => entry.kind === "project");
}

/** Returns the ids stored under `prefix`, mapped to their stored values. */
async function itemsWithPrefix(prefix: string): Promise<Map<string, string>> {
  const items = await LocalStorage.allItems<Record<string, string>>();
  return new Map(
    Object.entries(items)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), String(value)]),
  );
}

export async function getSeenIds(): Promise<Set<string> | undefined> {
  if (!(await LocalStorage.getItem(SEEN_INITIALIZED_KEY))) return undefined;
  return new Set((await itemsWithPrefix(SEEN_PREFIX)).keys());
}

/**
 * Before the first `getUnseenPosts` call there is no seen list yet. Both
 * functions below then do nothing: that first call marks every post as seen.
 */
export async function markSeen(ids: string[]): Promise<void> {
  if (!(await LocalStorage.getItem(SEEN_INITIALIZED_KEY))) return;
  await Promise.all(ids.map((id) => LocalStorage.setItem(SEEN_PREFIX + id, "1")));
}

export async function markUnseen(ids: string[]): Promise<void> {
  if (!(await LocalStorage.getItem(SEEN_INITIALIZED_KEY))) return;
  await Promise.all(ids.map((id) => LocalStorage.removeItem(SEEN_PREFIX + id)));
}

/**
 * Returns the posts the user has not seen yet. On the very first run every
 * existing post is marked as seen, so the user is not flooded with old posts.
 */
export async function getUnseenPosts(posts: Entry[]): Promise<Entry[]> {
  const seen = await getSeenIds();
  if (!seen) {
    await Promise.all(posts.map((post) => LocalStorage.setItem(SEEN_PREFIX + post.id, "1")));
    await LocalStorage.setItem(SEEN_INITIALIZED_KEY, "1");
    return [];
  }
  return posts.filter((post) => !seen.has(post.id));
}

/** Returns the posts from `posts` that have not triggered a notification yet. */
export async function getUnnotified(posts: Entry[]): Promise<Entry[]> {
  const notified = await itemsWithPrefix(NOTIFIED_PREFIX);
  return posts.filter((post) => !notified.has(post.id));
}

export async function markNotified(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => LocalStorage.setItem(NOTIFIED_PREFIX + id, "1")));
}

export async function unmarkNotified(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => LocalStorage.removeItem(NOTIFIED_PREFIX + id)));
}

/** Ids of posts in the reading list, most recently saved first. */
export async function getSavedIds(): Promise<string[]> {
  const saved = await itemsWithPrefix(SAVED_PREFIX);
  return [...saved].sort(([, a], [, b]) => Number(b) - Number(a)).map(([id]) => id);
}

export async function setSaved(id: string, saved: boolean): Promise<string[]> {
  if (saved) {
    await LocalStorage.setItem(SAVED_PREFIX + id, String(Date.now()));
  } else {
    await LocalStorage.removeItem(SAVED_PREFIX + id);
  }
  return getSavedIds();
}

const readingTimeCache = new Cache({ namespace: "reading-time" });
const READING_TIME_CONCURRENCY = 5;
const READING_TIME_TIMEOUT_MS = 10_000;
/** A page that loaded but shows no reading time is checked again after a day. */
const MISSING_RETRY_MS = 24 * 60 * 60 * 1000;
/** A request that failed (network error, timeout, bad status) is retried after 15 minutes. */
const FAILED_RETRY_MS = 15 * 60 * 1000;
const MISSING_PREFIX = "missing:";
const FAILED_PREFIX = "failed:";

type ReadingTimeResult = number | "missing" | "failed";

/**
 * Reads the "N min read" value the website renders for a post. The site is a
 * Next.js app, so the value sits in the page's serialized React payload as
 * `"children":[N," min read"]` (with escaped quotes).
 */
async function fetchReadingTime(url: string): Promise<ReadingTimeResult> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(READING_TIME_TIMEOUT_MS) });
    if (!response.ok) return "failed";
    const match = (await response.text()).match(/children\\?":\[(\d+),\\?" min read/);
    return match ? Number(match[1]) : "missing";
  } catch {
    return "failed";
  }
}

function isReadingTime(cached?: string): cached is string {
  return cached !== undefined && /^\d+$/.test(cached);
}

/** True when a cached miss or failure is recent enough that the page should not be checked yet. */
function isWaitingToRetry(cached: string): boolean {
  for (const [prefix, retryMs] of [
    [MISSING_PREFIX, MISSING_RETRY_MS],
    [FAILED_PREFIX, FAILED_RETRY_MS],
  ] as const) {
    if (cached.startsWith(prefix)) {
      return Date.now() - Number(cached.slice(prefix.length)) < retryMs;
    }
  }
  return false;
}

/**
 * Returns reading times in minutes, keyed by entry id. Found times are cached
 * for good, so each post page is only downloaded once. Pages without a time
 * wait before the next check; pass `retryNow` (used by Refresh) to check them
 * again right away.
 */
export async function getReadingTimes(entries: Entry[], retryNow = false): Promise<Record<string, number>> {
  const times: Record<string, number> = {};
  const pending: Entry[] = [];
  for (const entry of entries) {
    const cached = readingTimeCache.get(entry.id);
    if (cached && isReadingTime(cached)) {
      times[entry.id] = Number(cached);
    } else if (!cached || retryNow || !isWaitingToRetry(cached)) {
      pending.push(entry);
    }
  }

  for (let i = 0; i < pending.length; i += READING_TIME_CONCURRENCY) {
    const batch = pending.slice(i, i + READING_TIME_CONCURRENCY);
    const results = await Promise.all(batch.map((entry) => fetchReadingTime(entry.url)));
    results.forEach((result, index) => {
      const { id } = batch[index];
      if (typeof result === "number") {
        times[id] = result;
        readingTimeCache.set(id, String(result));
      } else if (!isReadingTime(readingTimeCache.get(id))) {
        // A slower, overlapping check must not replace a reading time that another check found.
        readingTimeCache.set(id, `${result === "missing" ? MISSING_PREFIX : FAILED_PREFIX}${Date.now()}`);
      }
    });
  }
  return times;
}
