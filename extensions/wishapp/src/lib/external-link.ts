const AFFILIATE_WORKER_URL = "https://go.getwish.app";

/**
 * Wrap a product URL in the same affiliate-tracking worker the web app uses
 * (`go.getwish.app`). The worker logs the click, applies affiliate codes for
 * known merchants (Amazon, Adtraction partners) and falls back to Skimlinks
 * for the rest, then 302-redirects.
 *
 * Mirrors `lib/client/links.ts:getExternalLink` in the main app — keep them
 * in sync.
 */
export function getExternalLink(url: string, itemId?: string): string {
  if (!url) return url;
  const params = new URLSearchParams({ url });
  if (itemId) params.set("xcust", itemId);
  return `${AFFILIATE_WORKER_URL}/?${params.toString()}`;
}
