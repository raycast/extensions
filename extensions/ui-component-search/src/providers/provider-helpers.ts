import { ComponentSource, LibraryId, ProviderResult, UIComponent } from "../types";
import { getCached, setCache } from "../utils/cache";

/** Convert a slug like "alert-dialog" to "Alert Dialog". */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Shared fetch-with-fallback flow for scraping providers.
 *
 * Handles, uniformly for every library, the three failure modes the review
 * called out — network errors, non-OK HTTP responses, and unparseable markup —
 * by falling back to the provider's bundled static list and marking the result
 * as `source: "fallback"` so a broken scraper stays visible in the UI. The
 * source status is cached alongside the components, so fallback data remains
 * marked as fallback for the lifetime of the cache entry.
 *
 * @param libraryId   The library being fetched (used as the cache key).
 * @param scrape      Performs the live fetch + parse. It should throw or return
 *                    an empty array to signal that the scrape did not yield a
 *                    usable result (which triggers the fallback).
 * @param buildFallback Builds the static fallback component list.
 */
export async function fetchWithFallback(
  libraryId: LibraryId,
  scrape: () => Promise<UIComponent[]>,
  buildFallback: () => UIComponent[],
): Promise<ProviderResult> {
  const cached = getCached(libraryId);
  if (cached) return cached;

  let components: UIComponent[] | null = null;
  let source: ComponentSource = "live";

  try {
    const scraped = await scrape();
    if (scraped.length > 0) {
      components = scraped;
    }
  } catch {
    // Network error or parse failure — fall through to the static fallback.
  }

  if (!components || components.length === 0) {
    components = buildFallback();
    source = "fallback";
  }

  setCache(libraryId, components, source);
  return { components, source };
}
