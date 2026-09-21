// Loading, caching and degradation, kept free of Raycast imports so the
// failure paths can be exercised outside the app: every dependency (fetch,
// cache, clock) is injected.
//
// THE DEGRADATION RULE: a failed refresh must never produce an empty screen
// while usable data exists. If the network fails and anything is cached, the
// cached payload is returned WITH the date it was computed, and the caller
// says so on screen. Only a failure with no cache at all is an error state.
import type { MarketPayload, ProductsPayload } from "./types";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/**
 * A payload is usable only if EVERY item carries the fields the UI reads
 * without guarding. The generator OMITS unknown values rather than sending
 * null, so a missing required field means a partial or malformed file, and
 * caching one would evict good data and then throw on render. Optional fields
 * (brand, avg_90d_usd, all_time_low, buy_state) stay optional: their absence
 * is the file's documented contract, not a fault.
 */
function productsUsable(p: ProductsPayload): boolean {
  if (!isStr(p?.generated) || !Array.isArray(p?.products) || p.products.length === 0) return false;
  return p.products.every(
    (i) =>
      isStr(i?.sku) &&
      isStr(i?.name) &&
      isStr(i?.url) &&
      isNum(i?.price_usd) &&
      (i.history_monthly === undefined ||
        (Array.isArray(i.history_monthly) &&
          i.history_monthly.every((e) => Array.isArray(e) && isStr(e[0]) && isNum(e[1])))),
  );
}

function marketUsable(p: MarketPayload): boolean {
  if (!isStr(p?.generated) || !Array.isArray(p?.segments) || p.segments.length === 0) return false;
  return p.segments.every(
    (s) =>
      isStr(s?.segment) &&
      isStr(s?.label) &&
      s.periods !== null &&
      typeof s.periods === "object" &&
      Object.values(s.periods).every((x) => isNum(x?.pct_change) && isNum(x?.product_count)),
  );
}

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
  return load<ProductsPayload>(deps, CACHE_KEY, PRODUCTS_URL, productsUsable);
}

export function loadMarket(deps: LoadDeps): Promise<LoadResult<MarketPayload>> {
  return load<MarketPayload>(deps, MARKET_CACHE_KEY, MARKET_URL, marketUsable);
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
