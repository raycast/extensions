/**
 * Display helpers shared by the analytics and giveaway commands. Kept free of
 * `@raycast/api` so they can be unit tested.
 */
import type { ThreadsMediaType, ThreadsPost } from "./threads-api";

/** Comfortable for a List row. The menu bar passes a much smaller cap of its own. */
const TITLE_MAX_CHARS = 80;

/** Enough words for the search bar to match on without shipping a whole post per item. */
const KEYWORD_LIMIT = 50;

const DAY_MS = 86_400_000;

// Built once: `Intl.NumberFormat` construction dominates the cost of formatting, and
// these run several times per list item on every render.
const PLAIN_NUMBER = new Intl.NumberFormat();
const COMPACT_NUMBER = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const DATE_ONLY = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * First line of a post, trimmed to fit; falls back to a placeholder for a text-less post.
 * `maxChars` counts what a reader sees as one character: cutting UTF-16 units split an
 * emoji into a lone surrogate, which renders as "�".
 */
export function postTitle(text: string, options: { maxChars?: number; fallback?: string } = {}): string {
  const { maxChars = TITLE_MAX_CHARS, fallback = "(No text)" } = options;
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return fallback;
  // Every grapheme is at least one UTF-16 unit, so a line this short already fits.
  if (firstLine.length <= maxChars) return firstLine;
  const graphemes = Array.from(GRAPHEMES.segment(firstLine), (part) => part.segment);
  return graphemes.length > maxChars ? `${graphemes.slice(0, maxChars - 1).join("")}…` : firstLine;
}

/** Search keywords for a post. Computed once at load time, never per render. */
export function postKeywords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean).slice(0, KEYWORD_LIMIT);
}

/** The window a "last N days" period covers. */
export function periodWindow(days: number): { since: Date; until: Date } {
  const until = new Date();
  return { since: new Date(until.getTime() - days * DAY_MS), until };
}

/**
 * The loaded posts that fall inside a window, and whether the window may hold more than
 * were loaded. `loadedTruncated` alone only says older posts exist: once the oldest
 * loaded post predates the window, every post in it is already here. `loaded` is newest
 * first, as `getPosts` returns it.
 */
export function postsInWindow<T extends { post: Pick<ThreadsPost, "timestamp"> }>(
  loaded: readonly T[],
  loadedTruncated: boolean,
  since: Date,
): { posts: T[]; truncated: boolean } {
  const start = since.getTime();
  const oldest = loaded.at(-1);
  return {
    posts: loaded.filter((item) => new Date(item.post.timestamp).getTime() >= start),
    truncated: loadedTruncated && (!oldest || new Date(oldest.post.timestamp).getTime() >= start),
  };
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return PLAIN_NUMBER.format(value);
}

/** Compact form for the menu bar title, where "12.3K" beats "12,345". */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return COMPACT_NUMBER.format(value);
}

export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return String(iso);
  return DATE_TIME.format(date);
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return String(iso);
  return DATE_ONLY.format(date);
}

export const MEDIA_TYPE_LABEL: Record<ThreadsMediaType, string> = {
  TEXT: "Text",
  IMAGE: "Image",
  VIDEO: "Video",
  CAROUSEL_ALBUM: "Carousel",
  AUDIO: "Audio",
  REPOST_FACADE: "Repost",
};
