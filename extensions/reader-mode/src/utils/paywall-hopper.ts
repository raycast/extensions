/**
 * Paywall Hopper — Orchestrates bypass attempts for paywalled content
 *
 * Tries multiple bypass methods in sequence:
 * 1. Googlebot User-Agent fetch (many sites serve full content to crawlers)
 * 2. Bingbot User-Agent (alternative search engine crawler)
 * 3. Social Media Referrer (some sites allow free access from social media)
 * 4. WallHopper re-fetch (simple re-fetch for soft paywalls)
 * 5. archive.is (primary archive service)
 * 6. Wayback Machine (broader coverage)
 *
 * Returns the first successful result or failure if all methods fail.
 */

import { paywallLog } from "./logger";
import { fetchHtmlAsGooglebot, fetchHtmlAsBingbot, fetchHtmlWithSocialReferrer, fetchHtmlWallHopper } from "./fetcher";
import { fetchFromArchiveIs, fetchFromWayback } from "./archive-fetcher";

/**
 * Source of successfully retrieved content
 */
export type PaywallBypassSource =
  | "googlebot"
  | "bingbot"
  | "social-referrer"
  | "wallhopper"
  | "archive.is"
  | "wayback"
  | "browser"
  | "none";

/**
 * Result from a paywall bypass attempt
 */
export interface PaywallHopperResult {
  /** Whether bypass was successful */
  success: boolean;
  /** The retrieved HTML content (if successful) */
  html?: string;
  /** Which method succeeded */
  source: PaywallBypassSource;
  /** URL of the archived version (for archive services) */
  archiveUrl?: string;
  /** Timestamp of the archived version */
  timestamp?: string;
  /** Error message if all methods failed */
  error?: string;
}

/**
 * Archive source metadata for article state
 */
export interface ArchiveSource {
  /** Which service provided the content */
  service: PaywallBypassSource;
  /** URL of the archived version (if applicable) */
  url?: string;
  /** Timestamp of the archived version */
  timestamp?: string;
  /** When the content was retrieved */
  retrievedAt: string;
}

/**
 * Attempts to bypass a paywall using multiple methods in sequence.
 *
 * Order of attempts:
 * 1. Googlebot User-Agent — Fast, works for sites that serve full content to crawlers
 * 2. Bingbot User-Agent — Alternative search engine crawler
 * 3. Social Media Referrer — Some sites allow free access from social media
 * 4. WallHopper — Simple re-fetch for soft paywalls (JavaScript-based blocking)
 * 5. archive.is — Primary archive, good for recent paywalled content
 * 6. Wayback Machine — Broader coverage, may have older snapshots
 *
 * @param url - The URL to attempt to bypass
 * @returns PaywallHopperResult with HTML content if successful
 */
export async function tryBypassPaywall(url: string): Promise<PaywallHopperResult> {
  paywallLog.log("hopper:start", { url });

  // Attempt 1: Googlebot User-Agent
  paywallLog.log("hopper:trying", { url, method: "googlebot" });
  const googlebotResult = await fetchHtmlAsGooglebot(url);

  if (googlebotResult.success) {
    paywallLog.log("hopper:success", {
      url,
      method: "googlebot",
      contentLength: googlebotResult.data.contentLength,
    });
    return {
      success: true,
      html: googlebotResult.data.html,
      source: "googlebot",
    };
  }

  // Attempt 2: Bingbot User-Agent
  paywallLog.log("hopper:trying", { url, method: "bingbot" });
  const bingbotResult = await fetchHtmlAsBingbot(url);

  if (bingbotResult.success) {
    paywallLog.log("hopper:success", {
      url,
      method: "bingbot",
      contentLength: bingbotResult.data.contentLength,
    });
    return {
      success: true,
      html: bingbotResult.data.html,
      source: "bingbot",
    };
  }

  // Attempt 3: Social Media Referrer
  paywallLog.log("hopper:trying", { url, method: "social-referrer" });
  const socialReferrerResult = await fetchHtmlWithSocialReferrer(url);

  if (socialReferrerResult.success) {
    paywallLog.log("hopper:success", {
      url,
      method: "social-referrer",
      contentLength: socialReferrerResult.data.contentLength,
    });
    return {
      success: true,
      html: socialReferrerResult.data.html,
      source: "social-referrer",
    };
  }

  // Attempt 4: WallHopper (simple re-fetch)
  paywallLog.log("hopper:trying", { url, method: "wallhopper" });
  const wallhopperResult = await fetchHtmlWallHopper(url);

  if (wallhopperResult.success) {
    paywallLog.log("hopper:success", {
      url,
      method: "wallhopper",
      contentLength: wallhopperResult.data.contentLength,
    });
    return {
      success: true,
      html: wallhopperResult.data.html,
      source: "wallhopper",
    };
  }

  // Attempt 5: archive.is
  paywallLog.log("hopper:trying", { url, method: "archive.is" });
  const archiveIsResult = await fetchFromArchiveIs(url);

  if (archiveIsResult.success && archiveIsResult.html) {
    paywallLog.log("hopper:success", {
      url,
      method: "archive.is",
      archiveUrl: archiveIsResult.archiveUrl,
      contentLength: archiveIsResult.html.length,
    });
    return {
      success: true,
      html: archiveIsResult.html,
      source: "archive.is",
      archiveUrl: archiveIsResult.archiveUrl,
      timestamp: archiveIsResult.timestamp,
    };
  }

  // Attempt 6: Wayback Machine
  paywallLog.log("hopper:trying", { url, method: "wayback" });
  const waybackResult = await fetchFromWayback(url);

  if (waybackResult.success && waybackResult.html) {
    paywallLog.log("hopper:success", {
      url,
      method: "wayback",
      archiveUrl: waybackResult.archiveUrl,
      contentLength: waybackResult.html.length,
    });
    return {
      success: true,
      html: waybackResult.html,
      source: "wayback",
      archiveUrl: waybackResult.archiveUrl,
      timestamp: waybackResult.timestamp,
    };
  }

  // All methods failed
  const errors = [
    googlebotResult.success ? null : `Googlebot: ${googlebotResult.error.message}`,
    bingbotResult.success ? null : `Bingbot: ${bingbotResult.error.message}`,
    socialReferrerResult.success ? null : `Social Referrer: ${socialReferrerResult.error.message}`,
    wallhopperResult.success ? null : `WallHopper: ${wallhopperResult.error.message}`,
    archiveIsResult.success ? null : `archive.is: ${archiveIsResult.error}`,
    waybackResult.success ? null : `Wayback: ${waybackResult.error}`,
  ]
    .filter(Boolean)
    .join("; ");

  paywallLog.log("hopper:failed", { url, errors });

  return {
    success: false,
    source: "none",
    error: `All bypass methods failed: ${errors}`,
  };
}

/**
 * Creates an ArchiveSource metadata object for successful bypass
 */
export function createArchiveSource(result: PaywallHopperResult): ArchiveSource | undefined {
  if (!result.success || result.source === "none") {
    return undefined;
  }

  return {
    service: result.source,
    url: result.archiveUrl,
    timestamp: result.timestamp,
    retrievedAt: new Date().toISOString(),
  };
}
