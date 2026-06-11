// Public API facade. All components/tools import from here, never from ./scraper.
// Credentialed: official GraphQL. No-key: Atom feed. No production HTML scraping.
import { LocalStorage } from "@raycast/api";
import { Product } from "../types";
import { graphql, getCredentials, hasCredentials, ApiError } from "./client";
import { FEATURED_POSTS_QUERY, POST_DETAIL_QUERY, FeaturedPostsResponse, PostDetailResponse } from "./queries";
import { postNodeToProduct, postDetailToProduct } from "./product";
import { getFeedProducts } from "./feed";
import { logger } from "@chrismessina/raycast-logger";

const log = logger.child("[ProductHuntAPI]");

// Product Hunt's "launch day" runs on Pacific time (posts feature at ~00:01 PT). Using UTC midnight
// returns an empty set during the ~7-8h window between UTC midnight and Pacific midnight (PH's
// "today" hasn't started yet). Compute midnight in America/Los_Angeles so "today's featured" matches
// PH's day. Uses Intl (full ICU is available in the Raycast runtime); falls back to UTC if anything
// unexpected happens.
function pacificMidnightIso(): string {
  try {
    const now = new Date();
    // Y-M-D of "now" as seen in Los Angeles (en-CA gives ISO-ish "2026-05-30").
    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    // Current PT offset (PDT in summer = -07:00, PST in winter = -08:00).
    const tzName = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      timeZoneName: "short",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    const offset = tzName === "PST" ? "-08:00" : "-07:00";
    return new Date(`${ymd}T00:00:00${offset}`).toISOString();
  } catch {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }
}

// Short-TTL LocalStorage response caching (rate-budget safety). The official frontpage GraphQL query
// consumes ~3300 of the API's 6250 complexity-points-per-15min budget, so two reopens within 15 min
// could 429. These caches let repeated command opens reuse a recent result. This is RESPONSE caching,
// separate from the token cache in client.ts.
const FRONTPAGE_API_CACHE_KEY = "frontpage_api_cache_v1";
const FRONTPAGE_FEED_CACHE_KEY = "frontpage_feed_cache_v1";
const PRODUCT_DETAIL_CACHE_PREFIX = "product_detail_api_cache_v1:";
const FRONTPAGE_CACHE_TTL_MS = 60_000; // 60s
const PRODUCT_DETAIL_CACHE_TTL_MS = 300_000; // 5 min

async function readCache<T>(key: string, ttlMs: number, validate?: (v: unknown) => boolean): Promise<T | null> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { ts: number; value: unknown };
    if (typeof entry.ts === "number" && Date.now() - entry.ts < ttlMs) {
      if (!validate || validate(entry.value)) {
        return entry.value as T;
      }
    }
  } catch {
    // ignore cache read errors; fall through to live fetch
  }
  return null;
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    // ignore cache write errors
  }
}

// Why a feed fallback happened, so the UI can surface the right message/action.
export type FeedReason = "no-credentials" | "incomplete-credentials" | "invalid-credentials" | "api-error";

export async function getFrontpageProducts(options?: { forceRefresh?: boolean }): Promise<{
  products: Product[];
  error?: string;
  usingFeed?: boolean;
  feedReason?: FeedReason;
}> {
  // forceRefresh (e.g. a "Refresh" action) bypasses the response cache so the user gets fresh data;
  // results are still written back to the cache afterward.
  const forceRefresh = options?.forceRefresh ?? false;
  let credsComplete = false;
  // The reason the no-key path will report if we fall through to it: plain "no-credentials" when both
  // fields are blank, "incomplete-credentials" when exactly one is filled (a misconfiguration the user
  // should fix, but never a reason to deny them the public feed that needs no credentials at all).
  let noKeyReason: FeedReason = "no-credentials";
  try {
    credsComplete = hasCredentials(getCredentials());
  } catch (error) {
    // Exactly one of key/secret present: don't hard-fail. Fall back to the feed like the no-key case,
    // but flag it so the UI can warn "Missing credentials. Showing basic feed."
    if (error instanceof ApiError && error.category === "missingCredentials") {
      noKeyReason = "incomplete-credentials";
    } else {
      // Any other (currently unreachable) credential-read failure: log, then degrade to feed.
      log.warn("unexpected error reading credentials; falling back to feed", error);
    }
  }

  if (credsComplete) {
    const cached = forceRefresh
      ? null
      : await readCache<Product[]>(FRONTPAGE_API_CACHE_KEY, FRONTPAGE_CACHE_TTL_MS, Array.isArray);
    if (cached) {
      log.debug("frontpage served from API cache", { count: cached.length });
      return { products: cached };
    }
    try {
      const postedAfter = pacificMidnightIso();
      log.debug("fetching frontpage via official API", { postedAfter });
      const data = await graphql<FeaturedPostsResponse>(
        FEATURED_POSTS_QUERY,
        {
          first: 30,
          postedAfter,
        },
        { forceRefresh },
      );
      const products = data.posts.edges.map((e) => postNodeToProduct(e.node));
      log.debug("frontpage API returned", { count: products.length });
      if (products.length > 0) await writeCache(FRONTPAGE_API_CACHE_KEY, products);
      return { products };
    } catch (error) {
      log.warn("frontpage API failed, falling back to feed", error);
      // Distinguish bad credentials (actionable: fix them in prefs) from a transient API error.
      const reason: FeedReason =
        error instanceof ApiError && error.category === "invalidCredentials" ? "invalid-credentials" : "api-error";
      // List view may fall back to feed (spec); detail view may not.
      const cachedFeed = forceRefresh
        ? null
        : await readCache<Product[]>(FRONTPAGE_FEED_CACHE_KEY, FRONTPAGE_CACHE_TTL_MS, Array.isArray);
      if (cachedFeed) {
        log.debug("frontpage served from feed cache", { count: cachedFeed.length });
        return { products: cachedFeed, usingFeed: true, feedReason: reason };
      }
      try {
        const products = await getFeedProducts();
        log.debug("frontpage feed returned", { count: products.length });
        if (products.length > 0) await writeCache(FRONTPAGE_FEED_CACHE_KEY, products);
        return { products, usingFeed: true, feedReason: reason };
      } catch (feedError) {
        return {
          products: [],
          error: feedError instanceof Error ? feedError.message : "Failed to load products.",
        };
      }
    }
  }

  // No (or incomplete) credentials: feed-only mode. noKeyReason distinguishes the two.
  const cachedFeed = forceRefresh
    ? null
    : await readCache<Product[]>(FRONTPAGE_FEED_CACHE_KEY, FRONTPAGE_CACHE_TTL_MS, Array.isArray);
  if (cachedFeed) {
    log.debug("frontpage served from feed cache", { count: cachedFeed.length, reason: noKeyReason });
    return { products: cachedFeed, usingFeed: true, feedReason: noKeyReason };
  }
  try {
    log.debug("no/incomplete credentials; fetching frontpage via Atom feed", { reason: noKeyReason });
    const products = await getFeedProducts();
    log.debug("frontpage feed returned", { count: products.length });
    if (products.length > 0) await writeCache(FRONTPAGE_FEED_CACHE_KEY, products);
    return { products, usingFeed: true, feedReason: noKeyReason };
  } catch (error) {
    return { products: [], error: error instanceof Error ? error.message : "Failed to load products." };
  }
}

// API-detail-backed replacement for the old scraper enrichment. Never fetches PH HTML.
//
// Two distinct outcomes, deliberately handled differently (per review: detail views must not
// silently fall back to thin data the way list views may):
//   - Enrichment NOT APPLICABLE (no credentials, no slug, or the post genuinely isn't found):
//     return the product unchanged. The detail view renders the list-level data it already has;
//     this is expected, not a failure.
//   - Enrichment ERRORED (GraphQL/network failure while we were able and trying to enrich):
//     THROW, so the detail view shows a visible error with retry / open-in-browser actions rather
//     than a broken-looking page presented as if it were complete.
export async function enhanceProductWithMetadata(product: Product): Promise<Product> {
  let credsComplete = false;
  try {
    credsComplete = hasCredentials(getCredentials());
  } catch {
    credsComplete = false;
  }
  if (!credsComplete) {
    log.debug("detail enrichment skipped (no credentials)");
    return product;
  }

  const slugMatch = product.url.match(/posts\/([^/?#]+)/);
  const slug = slugMatch ? slugMatch[1] : null;
  if (!slug) {
    log.debug("detail enrichment skipped (no slug in url)", { url: product.url });
    return product;
  }

  const detailCacheKey = `${PRODUCT_DETAIL_CACHE_PREFIX}${slug}`;
  const cached = await readCache<Product>(
    detailCacheKey,
    PRODUCT_DETAIL_CACHE_TTL_MS,
    (v) => typeof v === "object" && v !== null,
  );
  // Preserve any list-level fields the caller passed (same merge as the live path).
  if (cached) {
    log.debug("detail served from cache", { slug });
    return { ...product, ...cached };
  }

  try {
    log.debug("enriching product detail via API", { slug });
    const data = await graphql<PostDetailResponse>(POST_DETAIL_QUERY, { slug });
    // Post genuinely not found: not an error — return what we have.
    if (!data.post) {
      log.debug("detail enrichment: post not found", { slug });
      return product;
    }
    const detailed = postDetailToProduct(data.post);
    await writeCache(detailCacheKey, detailed);
    log.debug("detail enrichment ok", { slug });
    // Preserve any list-level fields not present on detail.
    return { ...product, ...detailed };
  } catch (error) {
    // A real failure (GraphQL/network) while enriching: surface it so the detail view can show an
    // error + retry/open-in-browser, instead of rendering thin list data as if it were complete.
    log.error("detail enrichment failed", error);
    throw error instanceof Error ? error : new Error("Failed to load product details.");
  }
}
