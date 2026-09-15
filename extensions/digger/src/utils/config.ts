import { CACHE_SCHEMA } from "./cacheSchema";

/** See CACHE.SALT. Bump this string when behaviour changes but types do not. */
const CACHE_SALT = "1";

/**
 * Centralized timeout configuration for all network requests.
 * All values are in milliseconds.
 */
export const TIMEOUTS = {
  /** Main HTML fetch (includes HTTPS→HTTP fallback time) */
  HTML_FETCH: 10000,
  /** Secondary resource fetches (robots.txt, sitemap.xml, etc.) */
  RESOURCE_FETCH: 5000,
  /** Host metadata (.well-known/host-meta) */
  HOST_META: 5000,
  /** TLS certificate info socket connection */
  TLS_SOCKET: 5000,
  /** A single Wayback Machine API request. Deliberately generous: the CDX
   *  precise-count query legitimately takes ~5s even on an 8-snapshot archive,
   *  so trimming this only fails requests that were going to succeed. The
   *  runaway case is bounded by WAYBACK_TOTAL instead. */
  WAYBACK_FETCH: 10000,
  /** Budget for the WHOLE Wayback lookup, across its four sequential requests
   *  and their retries. Without it a hung archive.org cost 4 requests x 2
   *  attempts x WAYBACK_FETCH — over a minute of spinner for one section. */
  WAYBACK_TOTAL: 15000,
  /** Budget for the WHOLE well-known sweep, across all 110 probes. Measured at
   *  0.6-2.4s for the full catalog against four hosts, so this only trips when
   *  a host is stalling connections rather than answering them. */
  WELL_KNOWN_TOTAL: 20000,
  /** One conditional GET of the IANA registry CSV. Off the dig's critical path. */
  REGISTRY_FETCH: 8000,
  /** One stylesheet fetched for its colour tokens. */
  STYLESHEET: 6000,
} as const;

/**
 * Cache configuration.
 */
export const CACHE = {
  /** How long cached results remain valid (in milliseconds) */
  DURATION_MS: 48 * 60 * 60 * 1000, // 48 hours
  /** Maximum number of cached entries to store */
  MAX_ENTRIES: 50,
  /** Key used to store the cache index in LocalStorage */
  INDEX_KEY: "digger_cache_index",
  /**
   * Prefix for cached entries.
   *
   * The version half is COMPUTED, not typed: `CACHE_SCHEMA` is a hash of
   * `src/types/index.ts`, so any change to the cached shape produces a new key
   * and purges every entry written under the old one.
   *
   * It works this way because the manual version was forgotten three times in a
   * single release — for `wellKnown`, for `theme`, and for `ThemeColor.hex` —
   * and each time an entry cached under the old shape rendered a missing field
   * as an established absence ("None published", "No theme declared", a token
   * with no swatch) for the full 48h TTL. Every one passed tsc, ray build and
   * ray lint, because a missing optional field is perfectly valid.
   *
   * The lesson generalises past caching: when the correctness of a change
   * depends on a human remembering a second, unrelated edit, the remembering IS
   * the defect. Derive it instead. See scripts/cache-schema.mjs.
   */
  /**
   * Bumped BY HAND when behaviour changes but the shape does not.
   *
   * The hash cannot see this case, and pretending otherwise is worse than
   * admitting it: correcting a classifier to report "unavailable" where it used
   * to report "absent" touches no type, so every cached wrong verdict would
   * survive its full TTL under an unchanged key. This is the one remaining
   * deliberate step — and it is deliberate because no derivation can detect a
   * change of meaning.
   */
  SALT: CACHE_SALT,
  KEY_PREFIX: `digger_cache_${CACHE_SCHEMA}.${CACHE_SALT}_`,
  /**
   * Shared prefix across ALL cache-key versions, used to find entries left by
   * earlier versions. INDEX_KEY starts with this too, so it must be excluded
   * explicitly wherever this is used to identify payloads.
   */
  KEY_FAMILY: "digger_cache_",
  /**
   * How often to ask IANA whether the well-known registry changed. It gains a
   * few entries a year, and the request is conditional — the steady state is a
   * 304 with no body — so a week is frequent enough to stay current and rare
   * enough to be invisible.
   */
  REGISTRY_CHECK_INTERVAL_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Fetch limits and thresholds.
 */
export const LIMITS = {
  /** Maximum bytes to read when extracting <head> content */
  MAX_HEAD_BYTES: 512 * 1024, // 512KB
  /** Minimum bytes to read before honoring </head> tag (handles JS-heavy sites with tiny initial heads) */
  MIN_HEAD_BYTES: 16 * 1024, // 16KB
  /** Default port for TLS certificate checks */
  TLS_PORT: 443,
  /** Maximum resources (stylesheets, scripts, images) to parse per page */
  MAX_RESOURCES: 50,
  /** Maximum entries to display in sitemap views */
  MAX_DISPLAY_ENTRIES: 100,
  /** Bytes read before judging what a resource IS. Enough for a doctype, an
   *  XML declaration or an opening brace; far short of downloading the file. */
  SNIFF_BYTES: 1024,
  /** Simultaneous `/.well-known/` probes. The catalog is ~110 paths and firing
   *  them all at once is scanner behaviour; a cap keeps one dig comparable to
   *  loading an ordinary web page. */
  WELL_KNOWN_CONCURRENCY: 10,
  /** Rows an export will build from one resource. A sitemap's size is the
   *  server's choice, and the extraction runs synchronously during render. */
  MAX_EXPORT_ROWS: 50000,
  /** Stylesheets fetched per dig for theme tokens. Sites link up to 54 of them;
   *  fetching all would dwarf the rest of the dig for diminishing returns. */
  MAX_STYLESHEETS: 3,
  /** Bytes read per stylesheet. Custom properties live in the opening rules
   *  (`:root`, `@layer theme`), so the tail is almost never where they are. */
  MAX_CSS_BYTES: 512 * 1024,
  /** Tokens kept. primer.style publishes 842 — past a point it is a data dump,
   *  and every one of them is persisted into a 50-entry LocalStorage cache. */
  MAX_THEME_TOKENS: 200,
  /** Sheets and tokens for the on-demand "View All Color Tokens" scan. The user
   *  asked for the whole palette and nothing here is cached, so the limits that
   *  keep the dig fast and the cache small do not apply — these exist only so a
   *  pathological site cannot run forever. */
  MAX_STYLESHEETS_DEEP: 40,
  MAX_THEME_TOKENS_DEEP: 2000,
} as const;

/**
 * Retry configuration for transient failures.
 */
export const RETRY = {
  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,
  /** Initial delay before first retry (in milliseconds) */
  INITIAL_DELAY_MS: 500,
  /** Maximum delay between retries (in milliseconds) */
  MAX_DELAY_MS: 5000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: RETRY.MAX_ATTEMPTS) */
  maxAttempts?: number;
  /** Initial delay in ms (default: RETRY.INITIAL_DELAY_MS) */
  initialDelayMs?: number;
  /** Maximum delay in ms (default: RETRY.MAX_DELAY_MS) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: RETRY.BACKOFF_MULTIPLIER) */
  backoffMultiplier?: number;
  /** Optional function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional abort signal to cancel retries */
  signal?: AbortSignal;
}

/**
 * Determines if an error is a transient network failure worth retrying.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      error.name === "AbortError" ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("etimedout") ||
      message.includes("enotfound") ||
      message.includes("socket hang up") ||
      message.includes("fetch failed")
    );
  }
  return false;
}

/**
 * Executes a function with exponential backoff retry on transient failures.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function, or throws after all retries exhausted
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = RETRY.MAX_ATTEMPTS,
    initialDelayMs = RETRY.INITIAL_DELAY_MS,
    maxDelayMs = RETRY.MAX_DELAY_MS,
    backoffMultiplier = RETRY.BACKOFF_MULTIPLIER,
    isRetryable = isTransientError,
    signal,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if aborted or not retryable
      if (signal?.aborted || !isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Wraps a function with retry, returning a fallback value on failure instead of throwing.
 *
 * @param fn - The async function to execute
 * @param fallback - Value to return if all retries fail
 * @param options - Retry configuration options
 * @returns The result of the function, or the fallback value
 */
export async function withRetryOrFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  options: RetryOptions = {},
): Promise<T> {
  try {
    return await withRetry(fn, options);
  } catch {
    return fallback;
  }
}
