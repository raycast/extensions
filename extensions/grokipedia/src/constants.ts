/**
 * Base URL for the Grokipedia API.
 */
export const API_BASE = "https://grokipedia.com/api";

/**
 * Base URL for the Grokipedia website.
 */
export const SITE_BASE = "https://grokipedia.com";

/**
 * Default limit for typeahead search suggestions.
 */
export const TYPEAHEAD_LIMIT = 10;

/**
 * Default limit for full-text search results.
 */
export const FULL_TEXT_SEARCH_LIMIT = 20;

/**
 * Default offset for full-text search pagination.
 */
export const FULL_TEXT_SEARCH_OFFSET = 0;

/**
 * Minimum characters required before triggering remote search.
 */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Debounce duration (ms) when streaming user input to search APIs.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Maximum allowed limit for API requests to prevent abuse.
 */
export const MAX_API_LIMIT = 100;

/**
 * Build a public site URL for an article slug.
 */
export function pageUrl(slug: string) {
  return `${SITE_BASE}/page/${slug}`;
}
