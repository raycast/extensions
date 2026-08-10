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
  "googlebot" | "bingbot" | "social-referrer" | "wallhopper" | "archive.is" | "wayback" | "browser" | "none";

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
 * A bypass method: fetches the URL some other way and reports whether it worked.
 *
 * Normalizes the two shapes the underlying fetchers return (the plain fetchers use a
 * `success`/`data` union; the archive fetchers return html + archive metadata) so the
 * waterfall below can treat every attempt identically.
 */
interface BypassMethod {
  source: PaywallBypassSource;
  /** Shown to the user while this attempt runs. */
  label: string;
  attempt: (url: string) => Promise<Omit<PaywallHopperResult, "source">>;
}

/** Adapts the `{ success, data | error }` fetchers to a PaywallHopperResult. */
const fromFetcher =
  (
    fetcher: (
      url: string,
    ) => Promise<{ success: true; data: { html: string } } | { success: false; error: { message: string } }>,
  ) =>
  async (url: string) => {
    const result = await fetcher(url);
    return result.success ? { success: true, html: result.data.html } : { success: false, error: result.error.message };
  };

/**
 * Bypass methods, in the order they are tried: cheapest and most likely first,
 * archives last (they are slow, and serve a possibly stale copy).
 */
const BYPASS_METHODS: BypassMethod[] = [
  { source: "googlebot", label: "Trying Googlebot…", attempt: fromFetcher(fetchHtmlAsGooglebot) },
  { source: "bingbot", label: "Trying Bingbot…", attempt: fromFetcher(fetchHtmlAsBingbot) },
  { source: "social-referrer", label: "Trying social referrer…", attempt: fromFetcher(fetchHtmlWithSocialReferrer) },
  { source: "wallhopper", label: "Trying WallHopper…", attempt: fromFetcher(fetchHtmlWallHopper) },
  { source: "archive.is", label: "Checking archive.is…", attempt: fetchFromArchiveIs },
  { source: "wayback", label: "Checking the Wayback Machine…", attempt: fetchFromWayback },
];

/**
 * Tries each bypass method in turn, returning the first that yields content.
 *
 * This can run for a while — every method is a network fetch, and the archives are
 * slow — so `onProgress` reports which one is in flight rather than leaving the UI blank.
 */
export async function tryBypassPaywall(
  url: string,
  onProgress?: (status: string) => void,
): Promise<PaywallHopperResult> {
  paywallLog.log("hopper:start", { url });

  const failures: string[] = [];

  for (const method of BYPASS_METHODS) {
    paywallLog.log("hopper:trying", { url, method: method.source });
    onProgress?.(method.label);

    const result = await method.attempt(url);

    if (result.success && result.html) {
      paywallLog.log("hopper:success", {
        url,
        method: method.source,
        contentLength: result.html.length,
        archiveUrl: result.archiveUrl,
      });
      return { ...result, source: method.source };
    }

    failures.push(`${method.source}: ${result.error ?? "no content"}`);
  }

  const errors = failures.join("; ");
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
