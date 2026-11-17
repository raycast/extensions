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
const FEED_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

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

function decodeCodePoint(code: number): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => decodeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
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

/** Parses `link` and returns it only if it is an https URL on aryantechie.com. */
function siteUrl(link?: string, base?: string): URL | undefined {
  try {
    const url = new URL(link ?? "", base);
    return url.protocol === "https:" && SITE_HOSTS.includes(url.hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Parses an https URL on any host, for cover images. */
function httpsUrl(link?: string): string | undefined {
  try {
    const url = new URL(link ?? "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Only accepts https links on aryantechie.com, since post pages are fetched
 * automatically. Returns the normalized URL, never the raw feed string.
 */
function parseLink(link?: string): { kind: EntryKind; url: string } | undefined {
  const url = siteUrl(link);
  if (!url) return undefined;
  if (url.pathname.startsWith("/blog/")) return { kind: "post", url: url.href };
  if (url.pathname.startsWith("/work/")) return { kind: "project", url: url.href };
  return undefined;
}

/**
 * Fetches a page on aryantechie.com. Redirects are followed by hand, and only
 * to https URLs on the same site, so a redirect cannot send the request elsewhere.
 */
async function fetchFromSite(url: string, timeoutMs: number): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(current, { signal, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const next = siteUrl(response.headers.get("location") ?? undefined, current);
    if (!next) throw new Error(`Blocked redirect away from aryantechie.com: ${current}`);
    current = next.href;
  }
  throw new Error(`Too many redirects: ${url}`);
}

function parseDate(value?: string): Date | undefined {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

/** Fetches the RSS feed and returns every post and project, newest first. */
export async function fetchEntries(): Promise<Entry[]> {
  const response = await fetchFromSite(FEED_URL, FEED_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }
  const feed = await parser.parseString(await response.text());

  return feed.items
    .flatMap((item): Entry[] => {
      const link = parseLink(item.link);
      if (!link) {
        return [];
      }
      const { kind, url } = link;
      const { excerpt, tags } = extractBody(item["content:encoded"]);
      const feedCategories = (item.categories ?? [])
        .map((category) => (typeof category === "string" ? category : category._))
        .filter((category) => category && !["blog", "work"].includes(category.toLowerCase()));

      return [
        {
          id: item.guid || url,
          kind,
          title: decodeEntities(item.title ?? "Untitled"),
          url,
          summary: decodeEntities(item.contentSnippet ?? item.content ?? ""),
          excerpt,
          coverImage: httpsUrl(item.enclosure?.url),
          categories: [...new Set([...feedCategories, ...tags])],
          date: parseDate(item.isoDate),
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
    // Wait for a non-empty feed, or every post would later look new.
    if (posts.length === 0) return [];
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
/** When Refresh was last used. Misses recorded by a load that started earlier are ignored. */
const RETRY_AFTER_KEY = "__retry-after";

type ReadingTimeResult = number | "missing" | "failed";

/**
 * Reads the "N min read" value the website renders for a post. The site is a
 * Next.js app, so the value sits in the page's serialized React payload as
 * `"children":[N," min read"]` (with escaped quotes).
 */
async function fetchReadingTime(url: string): Promise<ReadingTimeResult> {
  try {
    const response = await fetchFromSite(url, READING_TIME_TIMEOUT_MS);
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

/** The start time of the load that recorded a cached miss or failure, or 0 for anything else. */
function missStartedAt(cached?: string): number {
  const match = cached?.match(/^(?:missing|failed):(\d+)$/);
  return match ? Number(match[1]) : 0;
}

/** True when a cached miss or failure is recent enough that the page should not be checked yet. */
function isWaitingToRetry(cached: string): boolean {
  const retryAfter = Number(readingTimeCache.get(RETRY_AFTER_KEY) ?? 0);
  for (const [prefix, retryMs] of [
    [MISSING_PREFIX, MISSING_RETRY_MS],
    [FAILED_PREFIX, FAILED_RETRY_MS],
  ] as const) {
    if (cached.startsWith(prefix)) {
      const loadStartedAt = Number(cached.slice(prefix.length));
      return loadStartedAt >= retryAfter && Date.now() - loadStartedAt < retryMs;
    }
  }
  return false;
}

/**
 * Makes the next `getReadingTimes` call check pages without a reading time
 * again. Used by Refresh. Misses are stamped with the time their load started,
 * so misses written later by a load that was already running are ignored too.
 */
export function retryMissingReadingTimes(): void {
  readingTimeCache.set(RETRY_AFTER_KEY, String(Date.now()));
}

/**
 * Returns reading times in minutes, keyed by entry id. Found times are cached
 * for good, so each post page is only downloaded once. Pages without a time
 * wait before the next check.
 */
export async function getReadingTimes(entries: Entry[]): Promise<Record<string, number>> {
  const startedAt = Date.now();
  const times: Record<string, number> = {};
  const pending: Entry[] = [];
  for (const entry of entries) {
    const cached = readingTimeCache.get(entry.id);
    if (cached && isReadingTime(cached)) {
      times[entry.id] = Number(cached);
    } else if (!cached || !isWaitingToRetry(cached)) {
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
      } else {
        // A slower, overlapping check must not replace a reading time another check found,
        // or a miss recorded by a check that started later.
        const current = readingTimeCache.get(id);
        if (!isReadingTime(current) && missStartedAt(current) <= startedAt) {
          readingTimeCache.set(id, `${result === "missing" ? MISSING_PREFIX : FAILED_PREFIX}${startedAt}`);
        }
      }
    });
  }
  return times;
}
