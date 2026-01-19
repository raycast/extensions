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
} as const;
