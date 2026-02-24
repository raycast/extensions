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
  /** Wayback Machine API requests */
  WAYBACK_FETCH: 10000,
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
