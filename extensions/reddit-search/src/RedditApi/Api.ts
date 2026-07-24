import { XMLParser } from "fast-xml-parser";
import { logger } from "@chrismessina/raycast-logger";
import RedditResult from "./RedditResult";
import RedditResultItem from "./RedditResultItem";
import RedditResultSubreddit from "./RedditResultSubreddit";
import { createSearchUrl } from "./UrlBuilder";
import { RedditError } from "./errors";
import { cacheKey, readCache, writeCache } from "../util/searchCache";

const apiLog = logger.child("[RedditApi]");

/**
 * Reddit asks API clients to identify themselves as
 * `<platform>:<app id>:<version> (by /u/<username>)`. A missing or
 * browser-spoofed User-Agent is a fast path to being blocked.
 */
const USER_AGENT = "raycast:com.raycast.reddit-search:v1.4.0 (by /u/chrismessina)";

/** Reddit's Atom feed allows roughly one request per minute per IP. */
export const RATE_LIMIT_COOLDOWN_SECONDS = 60;

interface AtomLink {
  "@_href"?: string;
  "@_rel"?: string;
}

interface AtomEntry {
  id?: string;
  title?: string | number | boolean | { "#text"?: string };
  link?: AtomLink | AtomLink[];
  updated?: string;
  published?: string;
  content?: string | number | boolean | { "#text"?: string };
  category?: { "@_term"?: string; "@_label"?: string };
  "media:thumbnail"?: { "@_url"?: string };
}

function textOf(value: AtomEntry["title"]): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value["#text"] ?? "";
}

function hrefOf(entry: AtomEntry): string {
  const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
  const alternate = links.find((link) => link["@_rel"] === "alternate") ?? links[0];
  return alternate?.["@_href"] ?? "";
}

/** Decodes the HTML entities Reddit escapes into Atom `<content>` and `<title>`. */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#0?32;/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Reddit's Atom `<content>` is escaped HTML wrapping the post body. Strip it to
 * readable text and drop the trailing "submitted by … [link] [comments]" chrome
 * the feed appends to every self-post.
 *
 * The chrome is delimited structurally: Reddit wraps the real body in
 * `<!-- SC_OFF -->…<!-- SC_ON -->` and appends the attribution *after* `SC_ON`.
 * Cutting on that marker is safe; cutting on the bare phrase "submitted by" is
 * NOT — a post body that legitimately contains "submitted by" would be truncated.
 * When no marker is present (link posts have no SC block), keep the text whole.
 */
function contentToText(rawContent: string): string {
  const html = decodeEntities(rawContent);
  const scOnIndex = html.indexOf("<!-- SC_ON -->");
  const body = scOnIndex >= 0 ? html.slice(0, scOnIndex) : html;
  return (
    body
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      // Reddit renders its anchors as bare "[link]"/"[comments]" markers once the
      // tags are stripped, which read as noise in a description.
      .replace(/\[(link|comments)\]/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Pulls the first `<img>` out of a feed entry's escaped-HTML body.
 *
 * Post bodies embed all kinds of links, so an extension check keeps non-images
 * out of the detail view. Subreddit icons are served from Reddit's CDN and are
 * reliably images regardless of the path, hence `requireExtension: false`.
 */
function firstImageUrl(rawContent: string, { requireExtension = true } = {}): string {
  const match = decodeEntities(rawContent).match(/<img[^>]+src="([^"]+)"/i);
  const url = match?.[1] ?? "";
  if (!url) {
    return "";
  }
  return requireExtension && !/\.(jpg|jpeg|png|gif)(\?|$)/i.test(url) ? "" : url;
}

function parseFeed(xml: string): AtomEntry[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false });
  let doc: { feed?: { entry?: AtomEntry | AtomEntry[] } };
  try {
    doc = parser.parse(xml);
  } catch (error) {
    throw new RedditError(
      "parse",
      `Couldn’t read Reddit’s feed: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
  if (!doc.feed) {
    throw new RedditError("parse", "Reddit’s response was not a valid Atom feed.");
  }
  return doc.feed.entry ? (Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry]) : [];
}

/** The request budget Reddit reports on every response. */
export interface RateLimit {
  /**
   * Requests left in the current window, or `undefined` when Reddit omitted the
   * header. `undefined` is NOT "plenty left" — at ~1 request/minute a completed
   * request has likely spent the budget, so callers treat an unknown budget as
   * spent and arm the cooldown (holding is safe: cached searches still work; only
   * a genuine network call is gated).
   */
  remaining: number | undefined;
  /** Seconds until the window resets. */
  reset: number;
}

/** Parses a header as a finite number, or `undefined` when absent/empty/non-numeric. */
function parseHeaderNumber(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function fetchFeed(url: string, abort?: AbortController): Promise<{ xml: string; rateLimit: RateLimit }> {
  apiLog.debug("requesting feed", { url });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml" },
      signal: abort?.signal,
    });
  } catch (error) {
    // An aborted request is a superseded search, not a failure — let it through
    // untouched so callers can recognise and ignore it.
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new RedditError("network", error instanceof Error ? error.message : "Network error.");
  }

  // Reddit reports the remaining request budget on EVERY response (including
  // successes). We surface it so a caller can arm the cooldown when the budget is
  // spent — otherwise the guard only ever engages *after* a 429, i.e. one request
  // too late, and the next search earns the rate-limit it was meant to prevent.
  // A missing/non-numeric header parses to `undefined`, which the caller treats as
  // "spent" (see RateLimit.remaining) — safe against the 1-req/min window.
  const remaining = parseHeaderNumber(response.headers.get("x-ratelimit-remaining"));
  const resetRaw = parseHeaderNumber(response.headers.get("x-ratelimit-reset"));
  const reset = resetRaw !== undefined && resetRaw > 0 ? resetRaw : RATE_LIMIT_COOLDOWN_SECONDS;
  const rateLimit: RateLimit = { remaining, reset };

  if (response.status === 429) {
    apiLog.debug("rate limited", { reset });
    throw new RedditError("rateLimited", `Reddit is rate limiting requests. Try again in ${reset}s.`, reset);
  }

  if (response.status === 403) {
    throw new RedditError("blocked", "Reddit blocked this request.");
  }

  if (!response.ok) {
    throw new RedditError("network", `Reddit responded with ${response.status} ${response.statusText}.`);
  }

  return { xml: await response.text(), rateLimit };
}

/**
 * Searches Reddit posts, optionally restricted to a subreddit.
 *
 * A post search can return matching *subreddits* alongside posts, so entries are
 * filtered to Reddit's `t3_` (post) type prefix.
 */
export const searchAll = async (
  subreddit: string,
  query: string,
  limit: number,
  sort: string,
  abort?: AbortController,
  { forceRefresh = false } = {},
): Promise<RedditResult> => {
  const key = cacheKey(["posts", subreddit, query, limit, sort]);
  if (!forceRefresh) {
    const cached = readCache<RedditResult>(key);
    if (cached) {
      return { ...cached.payload, cachedAt: cached.cachedAt };
    }
  }

  const { xml, rateLimit } = await fetchFeed(createSearchUrl(subreddit, true, query, "", limit, sort), abort);
  const entries = parseFeed(xml);

  const items = entries
    .filter((entry) => (entry.id ?? "").startsWith("t3_"))
    .map((entry) => {
      const rawContent = textOf(entry.content);
      const url = hrefOf(entry);
      const timestamp = entry.published ?? entry.updated;

      return {
        id: (entry.id ?? url).replace(/^t3_/, ""),
        title: decodeEntities(textOf(entry.title)),
        url,
        contentUrl: "",
        description: contentToText(rawContent),
        imageUrl: firstImageUrl(rawContent),
        created: timestamp ?? "",
        thumbnail: entry["media:thumbnail"]?.["@_url"] ?? "",
        subreddit: entry.category?.["@_term"] ?? "",
        afterId: entry.id ?? "",
      } as RedditResultItem;
    });

  apiLog.debug("parsed post search", { count: items.length, rateLimit });

  const result: RedditResult = {
    url: createSearchUrl(subreddit, false, query, "", 0, sort),
    items,
    subreddits: [],
  };
  // Cache the payload WITHOUT the live rate-limit — a later cached hit must not
  // re-arm the cooldown off a stale budget reading.
  writeCache(key, result);
  return { ...result, rateLimit };
};

/** Searches for subreddits. Entries are filtered to Reddit's `t5_` (subreddit) type prefix. */
export const searchSubreddits = async (
  query: string,
  limit: number,
  abort?: AbortController,
  { forceRefresh = false } = {},
): Promise<RedditResult> => {
  const key = cacheKey(["subreddits", query, limit]);
  if (!forceRefresh) {
    const cached = readCache<RedditResult>(key);
    if (cached) {
      return { ...cached.payload, cachedAt: cached.cachedAt };
    }
  }

  const { xml, rateLimit } = await fetchFeed(createSearchUrl("", true, query, "sr", limit, ""), abort);
  const entries = parseFeed(xml);

  const subreddits = entries
    .filter((entry) => (entry.id ?? "").startsWith("t5_"))
    .map((entry) => {
      const url = hrefOf(entry);
      // The feed's link is the canonical `https://www.reddit.com/r/<name>/`, which
      // is the only place the correctly-cased subreddit name appears.
      const name = url.match(/\/r\/([^/]+)/)?.[1] ?? "";
      const timestamp = entry.updated ?? entry.published;

      // Most entries carry a display name ("Mac Miller"), but some are titled with
      // the bare handle ("r/macgaming"), which would render the prefix twice
      // alongside the accessory. Strip it and let the accessory show r/<name>.
      const rawTitle = decodeEntities(textOf(entry.title));
      const title = rawTitle.replace(/^\/?r\//i, "");

      const rawContent = textOf(entry.content);

      return {
        id: (entry.id ?? url).replace(/^t5_/, ""),
        title: title || name,
        url,
        subreddit: `/r/${name}/`,
        subredditName: name,
        // For a subreddit entry the feed's timestamp is when the subreddit was
        // *created* (r/Mac reports 2008), not its latest post — labelling it
        // "Posted" misrepresented it in the list.
        created: timestamp ?? "",
        // Only some subreddits embed an icon in their feed description, so this
        // is best-effort; the UI falls back to a generic icon when it's absent.
        iconUrl: firstImageUrl(rawContent, { requireExtension: false }),
        description: contentToText(rawContent),
        isFavorite: false,
        afterId: entry.id ?? "",
      } as RedditResultSubreddit;
    });

  apiLog.debug("parsed subreddit search", { count: subreddits.length, rateLimit });

  const result: RedditResult = {
    url: createSearchUrl("", false, query, "sr", 0, ""),
    items: [],
    subreddits,
  };
  writeCache(key, result);
  return { ...result, rateLimit };
};
