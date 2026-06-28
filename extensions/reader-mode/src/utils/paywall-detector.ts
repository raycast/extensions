/**
 * Paywall Text Detection
 *
 * Detects paywall markers in parsed article text content.
 * Used for sites like NYTimes that return 200 OK but serve preview/truncated content.
 */

import { paywallLog } from "./logger";
import { PAYWALL_KEYWORDS, isKnownPaywalledSite } from "../extractors/_paywall";

export interface PaywallTextDetectionResult {
  /** Whether paywall markers were detected in the text */
  isPaywalled: boolean;
  /** The specific pattern that matched (for debugging) */
  matchedPattern?: string;
  /** The URL that was checked */
  url: string;
}

/**
 * Detects paywall markers in article text content.
 *
 * This catches "soft paywalls" where the server returns 200 OK
 * but the content is truncated or contains paywall messaging.
 *
 * @param textContent - The extracted text content from the article
 * @param url - The article URL (used for site-specific detection)
 * @returns Detection result with matched pattern if found
 */
export function detectPaywallInText(textContent: string, url: string): PaywallTextDetectionResult {
  // Only check known paywalled sites to avoid false positives
  if (!isKnownPaywalledSite(url)) {
    return { isPaywalled: false, url };
  }

  // Check for paywall keywords in the content
  for (const pattern of PAYWALL_KEYWORDS) {
    if (pattern.test(textContent)) {
      paywallLog.log("paywall:text-detected", {
        url,
        pattern: pattern.source,
        contentLength: textContent.length,
      });

      return {
        isPaywalled: true,
        matchedPattern: pattern.source,
        url,
      };
    }
  }

  paywallLog.log("paywall:text-clean", { url, contentLength: textContent.length });
  return { isPaywalled: false, url };
}
