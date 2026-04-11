export const API_BASE_URL = "https://api.webstashai.com";

export const REQUEST_TIMEOUT_MS = 15_000;

export const CACHE_KEYS = {
  pages: "pages_cache",
  tags: "tags_cache",
  collections: "collections_cache",
  stats: "stats_cache",
  highlights: "highlights_cache",
  updatedAt: "cache_updated_at",
  version: "cache_version",
} as const;

export const CACHE_VERSION = 1;

export const CACHE_STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export const WEBSTASH_DASHBOARD_URL = "https://app.webstashai.com";
export const WEBSTASH_API_KEYS_URL =
  "https://app.webstashai.com/settings/api-keys";
export const WEBSTASH_UPGRADE_URL =
  "https://app.webstashai.com/settings/billing";
