import { Cache, LocalStorage } from "@raycast/api";
import Parser from "rss-parser";

export const FEED_URL = "https://www.aryantechie.com/api/rss";
export const BLOG_URL = "https://aryantechie.com/blog";
export const WORK_URL = "https://aryantechie.com/work";

const SEEN_KEY = "seen-post-ids";
const NOTIFIED_KEY = "notified-post-ids";
const SAVED_KEY = "saved-post-ids";

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

function kindOf(link?: string): EntryKind | undefined {
  if (link?.includes("/blog/")) return "post";
  if (link?.includes("/work/")) return "project";
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

export async function getSeenIds(): Promise<Set<string> | undefined> {
  const raw = await LocalStorage.getItem<string>(SEEN_KEY);
  return raw ? new Set(JSON.parse(raw) as string[]) : undefined;
}

/**
 * Before the first `getUnseenPosts` call there is no seen list yet. Both
 * functions below then do nothing: that first call marks every post as seen.
 */
export async function markSeen(ids: string[]): Promise<void> {
  const seen = await getSeenIds();
  if (!seen) return;
  ids.forEach((id) => seen.add(id));
  await LocalStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export async function markUnseen(ids: string[]): Promise<void> {
  const seen = await getSeenIds();
  if (!seen) return;
  ids.forEach((id) => seen.delete(id));
  await LocalStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

/**
 * Returns the posts the user has not seen yet. On the very first run every
 * existing post is marked as seen, so the user is not flooded with old posts.
 */
export async function getUnseenPosts(posts: Entry[]): Promise<Entry[]> {
  const seen = await getSeenIds();
  if (!seen) {
    await LocalStorage.setItem(SEEN_KEY, JSON.stringify(posts.map((post) => post.id)));
    return [];
  }
  return posts.filter((post) => !seen.has(post.id));
}

/** Returns the posts from `posts` that have not triggered a notification yet, and records them. */
export async function takeUnnotified(posts: Entry[]): Promise<Entry[]> {
  const raw = await LocalStorage.getItem<string>(NOTIFIED_KEY);
  const notified = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  const fresh = posts.filter((post) => !notified.has(post.id));
  if (fresh.length > 0) {
    fresh.forEach((post) => notified.add(post.id));
    await LocalStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]));
  }
  return fresh;
}

/** Ids of posts in the reading list, most recently saved first. */
export async function getSavedIds(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(SAVED_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function setSaved(id: string, saved: boolean): Promise<string[]> {
  const ids = (await getSavedIds()).filter((savedId) => savedId !== id);
  const next = saved ? [id, ...ids] : ids;
  await LocalStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

const readingTimeCache = new Cache({ namespace: "reading-time" });
const READING_TIME_CONCURRENCY = 5;

/**
 * Reads the "N min read" value the website renders for a post. The site is a
 * Next.js app, so the value sits in the page's serialized React payload as
 * `"children":[N," min read"]` (with escaped quotes).
 */
async function fetchReadingTime(url: string): Promise<number | undefined> {
  const response = await fetch(url);
  if (!response.ok) return undefined;
  const match = (await response.text()).match(/children\\?":\[(\d+),\\?" min read/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Returns reading times in minutes, keyed by entry id. Results are cached for
 * good, so each post page is only downloaded once; pass `refresh` to re-fetch.
 */
export async function getReadingTimes(entries: Entry[], refresh = false): Promise<Record<string, number>> {
  const times: Record<string, number> = {};
  const missing: Entry[] = [];
  for (const entry of entries) {
    const cached = refresh ? undefined : readingTimeCache.get(entry.id);
    if (cached) {
      times[entry.id] = Number(cached);
    } else {
      missing.push(entry);
    }
  }

  for (let i = 0; i < missing.length; i += READING_TIME_CONCURRENCY) {
    const batch = missing.slice(i, i + READING_TIME_CONCURRENCY);
    const results = await Promise.all(batch.map((entry) => fetchReadingTime(entry.url).catch(() => undefined)));
    results.forEach((minutes, index) => {
      if (minutes === undefined) return;
      times[batch[index].id] = minutes;
      readingTimeCache.set(batch[index].id, String(minutes));
    });
  }
  return times;
}
