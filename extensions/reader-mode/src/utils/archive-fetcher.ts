/**
 * Archive Service Fetcher
 *
 * Fetches content from web archive services (archive.is, Wayback Machine)
 * as fallback sources for paywalled content.
 */

import { paywallLog } from "./logger";

/** Callback for status updates during archive fetching */
export type ArchiveStatusCallback = (message: string) => void;

/** Timeout for archive.is requests (can be slow) */
export const ARCHIVE_IS_TIMEOUT_MS = 45000;

/** Timeout for Wayback Machine requests */
export const WAYBACK_TIMEOUT_MS = 30000;

/** Timeout for RemovePaywall requests */
export const REMOVEPAYWALL_TIMEOUT_MS = 30000;

/**
 * Result from an archive fetch attempt
 */
export interface ArchiveFetchResult {
  success: boolean;
  html?: string;
  archiveUrl?: string;
  service: "archive.is" | "wayback" | "removepaywall";
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
export async function fetchFromArchiveIs(
  url: string,
  onStatusUpdate?: ArchiveStatusCallback,
): Promise<ArchiveFetchResult> {
  paywallLog.log("bypass:archive-is:start", { url });
  onStatusUpdate?.("Retrieving archive from archive.is...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ARCHIVE_IS_TIMEOUT_MS);

    // archive.is/newest/{url} redirects to the most recent snapshot
    const archiveRequestUrl = `https://archive.is/newest/${encodeURIComponent(url)}`;

    const response = await fetch(archiveRequestUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeoutId);

    // Check if we got redirected to an actual archive page
    // archive.is URLs look like: https://archive.is/XXXXX or https://archive.is/2024/...
    const finalUrl = response.url;
    const isArchivePage = finalUrl.includes("archive.is/") && !finalUrl.includes("/newest/");

    if (!response.ok) {
      paywallLog.log("bypass:archive-is:failed", {
        url,
        statusCode: response.status,
        reason: `HTTP ${response.status}`,
      });
      return {
        success: false,
        service: "archive.is",
        error: `Archive.is returned HTTP ${response.status}`,
      };
    }

    if (!isArchivePage) {
      // No archived version found - archive.is returns a search page or error
      paywallLog.log("bypass:archive-is:failed", {
        url,
        reason: "No archived version found",
        finalUrl,
      });
      return {
        success: false,
        service: "archive.is",
        error: "No archived version found on archive.is",
      };
    }

    const html = await response.text();

    // Extract timestamp from archive.is page if available
    // Archive.is pages often have a timestamp in the URL like /2024.01.03-123456/
    const timestampMatch = finalUrl.match(/archive\.is\/(\d{4}\.\d{2}\.\d{2}-\d+)/);
    const timestamp = timestampMatch ? timestampMatch[1] : undefined;

    paywallLog.log("bypass:archive-is:success", {
      url,
      archiveUrl: finalUrl,
      contentLength: html.length,
      timestamp,
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

    paywallLog.log("bypass:archive-is:failed", {
      url,
      reason: isTimeout ? "Request timed out" : reason,
    });

    return {
      success: false,
      service: "archive.is",
      error: isTimeout ? "Archive.is request timed out" : reason,
    };
  }
}

/**
 * Fetch content from the Wayback Machine (web.archive.org).
 * Uses the availability API to find the closest snapshot, then fetches it.
 *
 * @param url - The original URL to find in the archive
 * @returns ArchiveFetchResult with HTML content and archive URL
 */
export async function fetchFromWayback(
  url: string,
  onStatusUpdate?: ArchiveStatusCallback,
): Promise<ArchiveFetchResult> {
  paywallLog.log("bypass:wayback:start", { url });
  onStatusUpdate?.("Checking Wayback Machine availability...");

  try {
    // Step 1: Check availability via the Wayback API
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

    const availabilityController = new AbortController();
    const availabilityTimeoutId = setTimeout(() => availabilityController.abort(), 10000);

    const availabilityResponse = await fetch(availabilityUrl, {
      signal: availabilityController.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(availabilityTimeoutId);

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
    const snapshotUrl = snapshot.url;
    const timestamp = snapshot.timestamp;

    paywallLog.log("bypass:wayback:snapshot-found", {
      url,
      snapshotUrl,
      timestamp,
    });
    onStatusUpdate?.("Retrieving archive from Wayback Machine...");

    // Step 2: Fetch the actual snapshot content
    const contentController = new AbortController();
    const contentTimeoutId = setTimeout(() => contentController.abort(), WAYBACK_TIMEOUT_MS);

    const contentResponse = await fetch(snapshotUrl, {
      signal: contentController.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(contentTimeoutId);

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
      reason: isTimeout ? "Request timed out" : reason,
    });

    return {
      success: false,
      service: "wayback",
      error: isTimeout ? "Wayback Machine request timed out" : reason,
    };
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
 * Fetch content from RemovePaywall.com.
 * This service attempts to bypass paywalls by fetching content through their proxy.
 *
 * @param url - The original URL to fetch
 * @returns ArchiveFetchResult with HTML content
 */
export async function fetchFromRemovePaywall(
  url: string,
  onStatusUpdate?: ArchiveStatusCallback,
): Promise<ArchiveFetchResult> {
  paywallLog.log("bypass:removepaywall:start", { url });
  onStatusUpdate?.("Trying RemovePaywall.com...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REMOVEPAYWALL_TIMEOUT_MS);

    const requestUrl = `https://www.removepaywall.com/search?url=${encodeURIComponent(url)}`;

    const response = await fetch(requestUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      paywallLog.log("bypass:removepaywall:failed", {
        url,
        statusCode: response.status,
        reason: `HTTP ${response.status}`,
      });
      return {
        success: false,
        service: "removepaywall",
        error: `RemovePaywall returned HTTP ${response.status}`,
      };
    }

    const html = await response.text();

    // Check if we got actual content (not an error page)
    // RemovePaywall may return a page with an error message if it can't fetch
    if (html.length < 1000 || html.includes("Unable to fetch") || html.includes("Error fetching")) {
      paywallLog.log("bypass:removepaywall:failed", {
        url,
        reason: "No content or error page returned",
        contentLength: html.length,
      });
      return {
        success: false,
        service: "removepaywall",
        error: "RemovePaywall could not fetch the content",
      };
    }

    paywallLog.log("bypass:removepaywall:success", {
      url,
      contentLength: html.length,
    });

    return {
      success: true,
      html,
      service: "removepaywall",
      archiveUrl: requestUrl,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = err instanceof Error && err.name === "AbortError";

    paywallLog.log("bypass:removepaywall:failed", {
      url,
      reason: isTimeout ? "Request timed out" : reason,
    });

    return {
      success: false,
      service: "removepaywall",
      error: isTimeout ? "RemovePaywall request timed out" : reason,
    };
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
