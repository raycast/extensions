export const API_BASE = "https://grokipedia.com/api";
export const SITE_BASE = "https://grokipedia.com";

/**
 * Build a public site URL for an article slug.
 */
export function pageUrl(slug: string) {
  return `${SITE_BASE}/page/${slug}`;
}
