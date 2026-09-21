// Loading, caching and degradation, kept free of Raycast imports so the
// failure paths can be exercised outside the app: every dependency (fetch,
// cache, clock) is injected.
//
// THE DEGRADATION RULE: a failed refresh must never produce an empty screen
// while usable data exists. If the network fails and anything is cached, the
// cached payload is returned WITH the date it was computed, and the caller
// says so on screen. Only a failure with no cache at all is an error state.
import type { MarketPayload, ProductsPayload } from "./types";

export const PRODUCTS_URL = "https://memradar.com/data/raycast-v1-products.json";
export const MARKET_URL = "https://memradar.com/data/raycast-v1-market.json";
// Matches the 4h edge cache on these files; the data itself changes once a day.
export const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 15000;
export const CACHE_KEY = "products-v1";
export const MARKET_CACHE_KEY = "market-v1";
// Identifies this client in the server's logs, so our traffic is attributable.
export const USER_AGENT = "memradar-raycast (+https://memradar.com)";
// Beyond this, the data is old enough that the reader should be told plainly.
export const STALE_AFTER_DAYS = 3;

export interface CacheLike {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export interface CachedEnvelope<T> {
  fetchedAt: number;
  payload: T;
}

export interface LoadResult<T> {
  payload: T;
  /** True when the network failed and this came from the cache instead. */
  servedFromCacheAfterFailure: boolean;
  /** Present only when the above is true. */
  error?: string;
}

export interface LoadDeps {
  cache: CacheLike;
  fetchImpl?: typeof fetch;
  now?: () => number;
  url?: string;
  ttlMs?: number;
  /**
   * Skip the cache and go to the network. THE REFRESH ACTION SETS THIS, and it
   * is the difference between a refresh and a no-op: without it, a user whose
   * cache is younger than the TTL has no way to reach newer data, which is
   * being stuck on stale data with no way out.
   */
  force?: boolean;
}

function readCache<T>(cache: CacheLike, key: string, isUsable: (p: T) => boolean): CachedEnvelope<T> | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (!parsed?.payload || !isUsable(parsed.payload)) return undefined;
    return parsed;
  } catch {
    // A corrupt cache entry is the same as no cache: refetch, do not crash.
    return undefined;
  }
}

/**
 * One loader for both files, so the caching, the degradation rule and the
 * request hygiene cannot differ between commands.
 */
async function load<T>(
  deps: LoadDeps,
  key: string,
  defaultUrl: string,
  isUsable: (payload: T) => boolean,
): Promise<LoadResult<T>> {
  const { cache } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const url = deps.url ?? defaultUrl;
  const ttlMs = deps.ttlMs ?? CACHE_TTL_MS;

  const cached = readCache<T>(cache, key, isUsable);
  if (!deps.force && cached && now() - cached.fetchedAt < ttlMs) {
    return { payload: cached.payload, servedFromCacheAfterFailure: false };
  }

  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = (await res.json()) as T;
    if (!isUsable(payload)) throw new Error("payload was empty or malformed");
    cache.set(key, JSON.stringify({ fetchedAt: now(), payload } satisfies CachedEnvelope<T>));
    return { payload, servedFromCacheAfterFailure: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (cached) return { payload: cached.payload, servedFromCacheAfterFailure: true, error: message };
    throw new Error(message);
  }
}

export function loadProducts(deps: LoadDeps): Promise<LoadResult<ProductsPayload>> {
  return load<ProductsPayload>(deps, CACHE_KEY, PRODUCTS_URL, (p) => Boolean(p?.products?.length));
}

export function loadMarket(deps: LoadDeps): Promise<LoadResult<MarketPayload>> {
  return load<MarketPayload>(deps, MARKET_CACHE_KEY, MARKET_URL, (p) => Boolean(p?.segments?.length));
}

/** Whole days between the payload's own computed date and now. */
export function ageInDays(generated: string, now: () => number = Date.now): number {
  const then = Date.parse(`${generated}T00:00:00Z`);
  if (Number.isNaN(then)) return 0;
  return Math.floor((now() - then) / 86400000);
}

export function isStale(generated: string, now: () => number = Date.now): boolean {
  return ageInDays(generated, now) > STALE_AFTER_DAYS;
}

/**
 * Local search over name, brand and SKU: every whitespace-separated token in
 * the query must appear somewhere in the haystack, so "trident 64gb" and
 * "64gb trident" both match. Runs against the payload already in memory; no
 * request is made per keystroke.
 */
export function matches(product: { brand?: string; sku: string; name: string }, query: string): boolean {
  const haystack = `${product.name} ${product.brand ?? ""} ${product.sku}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}
