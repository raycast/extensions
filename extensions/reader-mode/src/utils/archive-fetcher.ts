/**
 * Archive Service Fetcher
 *
 * Fetches content from web archive services (archive.is, Wayback Machine)
 * as fallback sources for paywalled content.
 */

import { paywallLog } from "./logger";
import { isValidUrl } from "./url-resolver";

/** Timeout for archive.is requests (can be slow) */
export const ARCHIVE_IS_TIMEOUT_MS = 45000;

/** Timeout for Wayback Machine requests */
export const WAYBACK_TIMEOUT_MS = 30000;

/** Standard browser headers for archive requests */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

/** Alternative archive.is domains to try when rate limited */
const ARCHIVE_IS_DOMAINS = ["archive.is", "archive.today", "archive.ph"];

/** Regex pattern to extract timestamp from archive.is URLs */
const ARCHIVE_TIMESTAMP_PATTERN = /archive\.(?:is|today|ph)\/([0-9]{4}\.[0-9]{2}\.[0-9]{2}-[0-9]+)/;

/**
 * Check if a URL is an archive.is page (not a search/newest redirect)
 */
function isArchiveIsPage(url: string): boolean {
  return (
    (url.includes("archive.is/") || url.includes("archive.today/") || url.includes("archive.ph/")) &&
    !url.includes("/newest/")
  );
}

/**
 * Result from an archive fetch attempt
 */
export interface ArchiveFetchResult {
  success: boolean;
  html?: string;
  archiveUrl?: string;
  service: "archive.is" | "wayback";
  timestamp?: string;
  error?: string;
}

/**
 * Wayback Machine availability API response
 */
interface WaybackAvailabilityResponse {
  url: string;
  archived_snapshots: {
    closest?: {
      status: string;
      available: boolean;
      url: string;
      timestamp: string;
    };
  };
}

/**
 * Fetch content from archive.is (also known as archive.today, archive.ph).
 * This service stores snapshots of web pages and is commonly used for
 * accessing paywalled content.
 *
 * @param url - The original URL to find in the archive
 * @returns ArchiveFetchResult with HTML content and archive URL
 */
export async function fetchFromArchiveIs(url: string): Promise<ArchiveFetchResult> {
  if (!isValidUrl(url)) {
    return {
      success: false,
      service: "archive.is",
      error: "Invalid URL provided",
    };
  }

  paywallLog.log("bypass:archive-is:start", { url });

  // Try each archive.is domain in sequence
  for (let i = 0; i < ARCHIVE_IS_DOMAINS.length; i++) {
    const domain = ARCHIVE_IS_DOMAINS[i];
    const isLastDomain = i === ARCHIVE_IS_DOMAINS.length - 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ARCHIVE_IS_TIMEOUT_MS);

    try {
      // archive.is/newest/{url} redirects to the most recent snapshot
      const archiveRequestUrl = `https://${domain}/newest/${encodeURIComponent(url)}`;

      const response = await fetch(archiveRequestUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: BROWSER_HEADERS,
      });

      // Check if we got redirected to an actual archive page
      // archive.is URLs look like: https://archive.is/XXXXX or https://archive.is/2024/...
      const finalUrl = response.url;
      const isArchivePage = isArchiveIsPage(finalUrl);

      // If we got rate limited (429) but were redirected to an archive page, try fetching it directly once
      if (!response.ok && response.status === 429 && isArchivePage) {
        const directController = new AbortController();
        const directTimeoutId = setTimeout(() => directController.abort(), ARCHIVE_IS_TIMEOUT_MS);

        try {
          const directResponse = await fetch(finalUrl, {
            signal: directController.signal,
            redirect: "follow",
            headers: BROWSER_HEADERS,
          });

          if (directResponse.ok) {
            const html = await directResponse.text();
            const timestampMatch = finalUrl.match(ARCHIVE_TIMESTAMP_PATTERN);
            const timestamp = timestampMatch ? timestampMatch[1] : undefined;

            paywallLog.log("bypass:archive-is:success-direct-fetch", {
              url,
              archiveUrl: finalUrl,
              contentLength: html.length,
              timestamp,
              domain,
            });

            return {
              success: true,
              html,
              archiveUrl: finalUrl,
              service: "archive.is",
              timestamp,
            };
          }
        } catch (directErr) {
          paywallLog.log("bypass:archive-is:direct-fetch-failed", {
            url,
            archiveUrl: finalUrl,
            domain,
            reason: directErr instanceof Error ? directErr.message : "Unknown error",
          });
        } finally {
          clearTimeout(directTimeoutId);
        }
        // If direct fetch failed, continue to next domain
        continue;
      }

      if (!response.ok) {
        // If this is the last domain, return error
        if (isLastDomain) {
          return {
            success: false,
            service: "archive.is",
            error: `Archive.is returned HTTP ${response.status}`,
          };
        }
        // Otherwise, try next domain
        continue;
      }

      if (!isArchivePage) {
        // No archived version found - archive.is returns a search page or error
        // If this is the last domain, return error
        if (isLastDomain) {
          return {
            success: false,
            service: "archive.is",
            error: "No archived version found on archive.is",
          };
        }
        // Otherwise, try next domain
        continue;
      }

      // Success! We got redirected to an archive page and response is OK
      const html = await response.text();

      // Extract timestamp from archive.is page if available
      // Archive.is pages often have a timestamp in the URL like /2024.01.03-123456/
      const timestampMatch = finalUrl.match(ARCHIVE_TIMESTAMP_PATTERN);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;

      paywallLog.log("bypass:archive-is:success", {
        url,
        archiveUrl: finalUrl,
        contentLength: html.length,
        timestamp,
        domain,
      });

      return {
        success: true,
        html,
        archiveUrl: finalUrl,
        service: "archive.is",
        timestamp,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      const isTimeout = err instanceof Error && err.name === "AbortError";

      // If this is the last domain, return error
      if (isLastDomain) {
        return {
          success: false,
          service: "archive.is",
          error: isTimeout ? "Archive.is request timed out" : reason,
        };
      }
      // Otherwise, try next domain
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // All domains failed
  return {
    success: false,
    service: "archive.is",
    error: "All archive.is domains failed",
  };
}

/**
 * Fetch content from the Wayback Machine (web.archive.org).
 * Uses the availability API to find the closest snapshot, then fetches it.
 *
 * @param url - The original URL to find in the archive
 * @returns ArchiveFetchResult with HTML content and archive URL
 */
export async function fetchFromWayback(url: string): Promise<ArchiveFetchResult> {
  if (!isValidUrl(url)) {
    return {
      success: false,
      service: "wayback",
      error: "Invalid URL provided",
    };
  }

  paywallLog.log("bypass:wayback:start", { url });

  const availabilityController = new AbortController();
  const availabilityTimeoutId = setTimeout(() => availabilityController.abort(), 10000);

  let snapshotUrl: string;
  let timestamp: string;

  try {
    // Step 1: Check availability via the Wayback API
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

    const availabilityResponse = await fetch(availabilityUrl, {
      signal: availabilityController.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!availabilityResponse.ok) {
      paywallLog.log("bypass:wayback:failed", {
        url,
        reason: `Availability API returned HTTP ${availabilityResponse.status}`,
      });
      return {
        success: false,
        service: "wayback",
        error: `Wayback availability check failed: HTTP ${availabilityResponse.status}`,
      };
    }

    const availabilityData: WaybackAvailabilityResponse = await availabilityResponse.json();

    if (!availabilityData.archived_snapshots?.closest?.available) {
      paywallLog.log("bypass:wayback:failed", {
        url,
        reason: "No snapshot available",
      });
      return {
        success: false,
        service: "wayback",
        error: "No archived version found on Wayback Machine",
      };
    }

    const snapshot = availabilityData.archived_snapshots.closest;
    snapshotUrl = snapshot.url;
    timestamp = snapshot.timestamp;

    paywallLog.log("bypass:wayback:snapshot-found", {
      url,
      snapshotUrl,
      timestamp,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = err instanceof Error && err.name === "AbortError";

    paywallLog.log("bypass:wayback:failed", {
      url,
      reason: isTimeout ? "Availability check timed out" : reason,
    });

    return {
      success: false,
      service: "wayback",
      error: isTimeout ? "Wayback availability check timed out" : reason,
    };
  } finally {
    clearTimeout(availabilityTimeoutId);
  }

  // Step 2: Fetch the actual snapshot content
  const contentController = new AbortController();
  const contentTimeoutId = setTimeout(() => contentController.abort(), WAYBACK_TIMEOUT_MS);

  try {
    const contentResponse = await fetch(snapshotUrl, {
      signal: contentController.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    });

    if (!contentResponse.ok) {
      paywallLog.log("bypass:wayback:failed", {
        url,
        snapshotUrl,
        reason: `Snapshot fetch returned HTTP ${contentResponse.status}`,
      });
      return {
        success: false,
        service: "wayback",
        error: `Failed to fetch Wayback snapshot: HTTP ${contentResponse.status}`,
      };
    }

    const rawHtml = await contentResponse.text();

    // Rewrite Wayback URLs back to original URLs so images load from live site
    const html = rewriteWaybackUrls(rawHtml);

    // Format timestamp for display (YYYYMMDDHHMMSS -> readable)
    const formattedTimestamp = formatWaybackTimestamp(timestamp);

    paywallLog.log("bypass:wayback:success", {
      url,
      archiveUrl: snapshotUrl,
      contentLength: html.length,
      timestamp: formattedTimestamp,
      urlsRewritten: rawHtml.length !== html.length,
    });

    return {
      success: true,
      html,
      archiveUrl: snapshotUrl,
      service: "wayback",
      timestamp: formattedTimestamp,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = err instanceof Error && err.name === "AbortError";

    paywallLog.log("bypass:wayback:failed", {
      url,
      snapshotUrl,
      reason: isTimeout ? "Snapshot fetch timed out" : reason,
    });

    return {
      success: false,
      service: "wayback",
      error: isTimeout ? "Wayback snapshot fetch timed out" : reason,
    };
  } finally {
    clearTimeout(contentTimeoutId);
  }
}

/**
 * Format Wayback Machine timestamp (YYYYMMDDHHMMSS) to readable format
 */
function formatWaybackTimestamp(timestamp: string): string {
  if (!timestamp || timestamp.length < 8) return timestamp;

  try {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);

    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return timestamp;
  }
}

/**
 * Rewrite Wayback Machine URLs in HTML back to original URLs.
 *
 * Wayback rewrites all URLs to point to archived versions:
 * - http://web.archive.org/web/20241009151945im_/https://example.com/image.jpg
 * - http://web.archive.org/web/20241009151945/https://example.com/page
 *
 * This extracts the original URLs so images load from the live site
 * (which usually still works) instead of the archive proxy (which often fails).
 */
export function rewriteWaybackUrls(html: string): string {
  // Pattern matches Wayback URLs and captures the original URL
  // Handles both http and https, and various Wayback modifiers (im_, js_, cs_, etc.)
  const waybackUrlPattern =
    /https?:\/\/web\.archive\.org\/web\/\d+(?:im_|js_|cs_|if_|mp_|)?\/?((https?:\/\/[^"'\s<>]+))/g;

  return html.replace(waybackUrlPattern, (_match, _fullUrl, originalUrl) => {
    return originalUrl;
  });
}
