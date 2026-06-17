/**
 * Paywall Detection Utilities
 *
 * Standalone utility functions for detecting paywalled content.
 * Kept separate from core extraction logic so the Paywall Hopper
 * feature can be maintained independently or removed if needed.
 */

import { paywallLog } from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PaywallDocument = any;

/**
 * Result of paywall detection
 */
export interface PaywallDetectionResult {
  /** Whether the content appears to be paywalled */
  isPaywalled: boolean;
  /** Array of detected paywall signals (for debugging) */
  signals: string[];
  /** The URL that was checked */
  url: string;
}

/**
 * Paywall detection constants
 */
export const MIN_ARTICLE_LENGTH = 500; // Characters below this = likely truncated

export const TRUNCATION_PATTERNS: RegExp[] = [
  /continue reading/i,
  /read more\.{0,3}$/i,
  /subscribe to (?:continue|read|unlock)/i,
  /sign in to continue/i,
  /members only/i,
  /premium content/i,
  /exclusive content/i,
  /unlock (?:this|full) (?:article|story)/i,
  /\.{3}$/, // Ends with ellipsis
  /…$/, // Unicode ellipsis
];

export const PAYWALL_KEYWORDS: RegExp[] = [
  /subscribe now/i,
  /start your (?:free )?(?:trial|subscription)/i,
  /already a (?:subscriber|member)\?/i,
  /create (?:a )?(?:free )?account/i,
  /sign up to read/i,
  /you(?:'ve| have) (?:reached|used) your (?:free )?(?:article|story) limit/i,
  /(?:free )?articles? remaining/i,
  /this (?:article|story|content) is (?:for|available to) (?:subscribers|members|premium)/i,
  // NYTimes-specific patterns (serves 200 OK with preview content)
  /you have a preview view of this article/i,
  /thank you for your patience while we verify access/i,
  /please exit and log into your Times account/i,
  /want all of The Times\? Subscribe/i,
];

export const PAYWALL_SELECTORS: string[] = [
  '[class*="paywall"]',
  '[class*="subscribe-wall"]',
  '[class*="subscription-wall"]',
  '[class*="meter-"]',
  '[class*="metered"]',
  '[id*="paywall"]',
  "[data-paywall]",
  '[data-testid*="paywall"]',
  ".pw-overlay",
  ".subscriber-only",
  ".premium-content-gate",
];

/**
 * Site-specific paywall selectors.
 * Add custom selectors for sites that use non-standard paywall elements.
 */
export const SITE_PAYWALL_SELECTORS: Record<string, string[]> = {
  "medium.com": [
    '[data-testid="storyMemberOnlyBadge"]',
    '[data-testid="paywall-modal"]',
    ".meteredContent",
    '[aria-label="Member-only story"]',
  ],
  "nytimes.com": [
    '[data-testid="inline-message"]',
    ".css-mcm29f", // NYT paywall modal
    '[class*="gateway"]',
  ],
  "wsj.com": ['[class*="snippet"]', ".wsj-snippet-login", '[data-type="paywall"]'],
  "washingtonpost.com": ['[data-qa="article-body-ad"]', ".paywall-overlay"],
  "theatlantic.com": [".article-cover-extra", '[class*="paywall"]'],
};

/**
 * Helper to safely query a selector on a document
 */
function querySelector(document: PaywallDocument, selector: string): PaywallDocument | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * Get the hostname from a URL
 */
function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Get site-specific paywall selectors for a URL
 */
export function getSitePaywallSelectors(url: string): string[] {
  const hostname = getHostname(url);
  if (!hostname) return [];

  // Check for exact match or subdomain match
  for (const [domain, selectors] of Object.entries(SITE_PAYWALL_SELECTORS)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return selectors;
    }
  }

  return [];
}

/**
 * Detect if content appears to be paywalled using generic heuristics.
 *
 * @param document - The parsed DOM document
 * @param url - The page URL
 * @param textContent - The extracted text content to analyze
 * @returns PaywallDetectionResult with detection status and signals
 */
export function detectPaywall(document: PaywallDocument, url: string, textContent: string): PaywallDetectionResult {
  const signals: string[] = [];

  // 1. Short content detection
  if (textContent.length > 0 && textContent.length < MIN_ARTICLE_LENGTH) {
    signals.push(`short_content:${textContent.length}_chars`);
  }

  // 2. Truncation marker detection (check end of content)
  const lastChars = textContent.slice(-100);
  for (const pattern of TRUNCATION_PATTERNS) {
    if (pattern.test(lastChars)) {
      signals.push(`truncation_marker:${pattern.source}`);
      break; // Only report first match
    }
  }

  // 3. Paywall keyword detection in content
  for (const pattern of PAYWALL_KEYWORDS) {
    if (pattern.test(textContent)) {
      signals.push(`paywall_keyword:${pattern.source}`);
      break; // Only report first match
    }
  }

  // 4. Paywall overlay element detection
  const allSelectors = [...PAYWALL_SELECTORS, ...getSitePaywallSelectors(url)];
  for (const selector of allSelectors) {
    const element = querySelector(document, selector);
    if (element) {
      signals.push(`paywall_element:${selector}`);
      break; // Only report first match
    }
  }

  const isPaywalled = signals.length > 0;

  // Log the detection result
  if (isPaywalled) {
    paywallLog.log("paywall:detected", { url, signals });
  } else {
    paywallLog.log("paywall:not-detected", { url });
  }

  return {
    isPaywalled,
    signals,
    url,
  };
}

/**
 * Quick check if a URL is from a known paywalled site.
 * Useful for pre-emptive checks before fetching.
 *
 * @param url - The URL to check
 * @returns true if the site is known to have paywalls
 */
export function isKnownPaywalledSite(url: string): boolean {
  const hostname = getHostname(url);
  if (!hostname) return false;

  const knownPaywalledDomains = [
    "wsj.com",
    "nytimes.com",
    "washingtonpost.com",
    "theatlantic.com",
    "newyorker.com",
    "economist.com",
    "ft.com",
    "bloomberg.com",
    "businessinsider.com",
    "wired.com",
    "medium.com",
    "substack.com",
    "lemonde.fr",
  ];

  return knownPaywalledDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}
