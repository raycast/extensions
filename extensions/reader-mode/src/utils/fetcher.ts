import { fetchLog, paywallLog } from "./logger";

export interface FetchResult {
  html: string;
  url: string;
  contentLength: number;
  contentType: string | null;
}

export interface FetchError {
  type: "network" | "http" | "blocked" | "timeout" | "unknown";
  message: string;
  statusCode?: number;
}

/**
 * Googlebot User-Agent for paywall bypass attempts.
 * Many sites serve full content to search engine crawlers for SEO.
 * From: https://github.com/wasi-master/13ft
 */
export const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0.6533.119 Mobile Safari/537.36 " +
  "(compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Bingbot User-Agent - alternative search engine crawler
 */
export const BINGBOT_USER_AGENT = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

/**
 * Social media referrers that some sites allow for free access
 */
const SOCIAL_REFERRERS = [
  "https://twitter.com/",
  "https://www.facebook.com/",
  "https://t.co/",
  "https://www.reddit.com/",
];

/** Timeout for Googlebot fetch attempts (shorter than normal) */
export const GOOGLEBOT_TIMEOUT_MS = 15000;

/** Timeout for WallHopper re-fetch attempts */
export const WALLHOPPER_TIMEOUT_MS = 15000;

/**
 * Fetches HTML content from a URL with error handling and logging
 */
export async function fetchHtml(
  url: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  fetchLog.log("fetch:start", { url });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    // Extract origin for Referer header
    const urlObj = new URL(url);
    const origin = urlObj.origin;

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        Connection: "keep-alive",
        DNT: "1",
        Referer: origin + "/",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      const error = getHttpError(response.status);
      fetchLog.error("fetch:error", { url, type: error.type, statusCode: response.status, message: error.message });
      return { success: false, error };
    }

    const html = await response.text();
    const contentType = response.headers.get("content-type");

    fetchLog.log("fetch:success", {
      url,
      statusCode: response.status,
      contentLength: html.length,
      contentType,
    });

    return {
      success: true,
      data: {
        html,
        url: response.url, // Use final URL after redirects
        contentLength: html.length,
        contentType,
      },
    };
  } catch (err) {
    const error = categorizeError(err);
    fetchLog.error("fetch:error", { url, type: error.type, message: error.message });
    return { success: false, error };
  }
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
function getHttpError(status: number): FetchError {
  switch (status) {
    case 401:
    case 403:
      return { type: "blocked", message: "Access denied — this page requires authentication", statusCode: status };
    case 404:
      return { type: "http", message: "Page not found", statusCode: status };
    case 410:
      return { type: "http", message: "This page no longer exists", statusCode: status };
    case 429:
      return { type: "blocked", message: "Too many requests — please try again later", statusCode: status };
    case 451:
      return { type: "blocked", message: "Unavailable for legal reasons", statusCode: status };
    case 500:
    case 502:
    case 503:
    case 504:
      return { type: "http", message: "Server error — the website is having issues", statusCode: status };
    default:
      return { type: "http", message: `HTTP error ${status}`, statusCode: status };
  }
}

/**
 * Categorizes fetch errors into types
 */
function categorizeError(err: unknown): FetchError {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return { type: "timeout", message: "Request timed out — the page took too long to load" };
    }
    if (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("ENOTFOUND")) {
      return { type: "network", message: "Unable to reach the website — check your connection" };
    }
    return { type: "unknown", message: err.message };
  }
  return { type: "unknown", message: "An unexpected error occurred" };
}

/**
 * Fetches HTML content using Googlebot User-Agent for paywall bypass.
 * Many paywalled sites serve full content to search engine crawlers for SEO indexing.
 *
 * Based on the 13ft technique: https://github.com/wasi-master/13ft
 *
 * @param url - The URL to fetch
 * @returns FetchResult on success, FetchError on failure
 */
export async function fetchHtmlAsGooglebot(
  url: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  paywallLog.log("bypass:googlebot:start", { url });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLEBOT_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": GOOGLEBOT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = getHttpError(response.status);
      paywallLog.log("bypass:googlebot:failed", {
        url,
        statusCode: response.status,
        reason: error.message,
      });
      return { success: false, error };
    }

    const html = await response.text();
    const contentType = response.headers.get("content-type");

    paywallLog.log("bypass:googlebot:success", {
      url,
      statusCode: response.status,
      contentLength: html.length,
    });

    return {
      success: true,
      data: {
        html,
        url: response.url,
        contentLength: html.length,
        contentType,
      },
    };
  } catch (err) {
    const error = categorizeError(err);
    paywallLog.log("bypass:googlebot:failed", { url, reason: error.message });
    return { success: false, error };
  }
}

/**
 * WallHopper technique: Simple re-fetch of the URL with minimal headers.
 * Works for soft paywalls where the full content is sent but blocked by JavaScript.
 * Based on: https://github.com/modularizer/WallHopper
 *
 * The browser version does: fetch(location.href).then(r=>r.text()).then(r=>document.body.outerHTML=r)
 * We adapt this by doing a simple re-fetch with minimal headers.
 *
 * @param url - The URL to re-fetch
 * @returns FetchResult on success, FetchError on failure
 */
export async function fetchHtmlWallHopper(
  url: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  paywallLog.log("bypass:wallhopper:start", { url });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WALLHOPPER_TIMEOUT_MS);

    // Simple re-fetch with minimal headers - similar to browser's fetch()
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Minimal headers - let the server decide what to serve
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = getHttpError(response.status);
      paywallLog.log("bypass:wallhopper:failed", {
        url,
        statusCode: response.status,
        reason: error.message,
      });
      return { success: false, error };
    }

    const html = await response.text();
    const contentType = response.headers.get("content-type");

    paywallLog.log("bypass:wallhopper:success", {
      url,
      statusCode: response.status,
      contentLength: html.length,
    });

    return {
      success: true,
      data: {
        html,
        url: response.url,
        contentLength: html.length,
        contentType,
      },
    };
  } catch (err) {
    const error = categorizeError(err);
    paywallLog.log("bypass:wallhopper:failed", { url, reason: error.message });
    return { success: false, error };
  }
}

/**
 * Fetch with social media referrer header.
 * Some sites (like NYTimes) allow free access when referred from social media.
 *
 * @param url - The URL to fetch
 * @param referrer - The referrer URL to use
 * @returns FetchResult on success, FetchError on failure
 */
async function fetchWithReferrer(
  url: string,
  referrer: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLEBOT_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: referrer,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = getHttpError(response.status);
      return { success: false, error };
    }

    const html = await response.text();
    const contentType = response.headers.get("content-type");

    return {
      success: true,
      data: {
        html,
        url: response.url,
        contentLength: html.length,
        contentType,
      },
    };
  } catch (err) {
    const error = categorizeError(err);
    return { success: false, error };
  }
}

/**
 * Fetch with Bingbot User-Agent (alternative to Googlebot).
 * Some sites may serve content to Bingbot but not Googlebot.
 *
 * @param url - The URL to fetch
 * @returns FetchResult on success, FetchError on failure
 */
export async function fetchHtmlAsBingbot(
  url: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  paywallLog.log("bypass:bingbot:start", { url });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLEBOT_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BINGBOT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = getHttpError(response.status);
      paywallLog.log("bypass:bingbot:failed", {
        url,
        statusCode: response.status,
        reason: error.message,
      });
      return { success: false, error };
    }

    const html = await response.text();
    const contentType = response.headers.get("content-type");

    paywallLog.log("bypass:bingbot:success", {
      url,
      statusCode: response.status,
      contentLength: html.length,
    });

    return {
      success: true,
      data: {
        html,
        url: response.url,
        contentLength: html.length,
        contentType,
      },
    };
  } catch (err) {
    const error = categorizeError(err);
    paywallLog.log("bypass:bingbot:failed", { url, reason: error.message });
    return { success: false, error };
  }
}

/**
 * Try fetching with social media referrers.
 * Some sites allow free access when referred from social media platforms.
 *
 * @param url - The URL to fetch
 * @returns FetchResult on success, FetchError on failure
 */
export async function fetchHtmlWithSocialReferrer(
  url: string,
): Promise<{ success: true; data: FetchResult } | { success: false; error: FetchError }> {
  paywallLog.log("bypass:social-referrer:start", { url });

  // Try each social media referrer
  for (const referrer of SOCIAL_REFERRERS) {
    const result = await fetchWithReferrer(url, referrer);

    if (result.success) {
      paywallLog.log("bypass:social-referrer:success", {
        url,
        referrer,
        contentLength: result.data.contentLength,
      });
      return result;
    }
  }

  paywallLog.log("bypass:social-referrer:failed", { url });
  return {
    success: false,
    error: { type: "blocked", message: "All social referrer attempts failed" },
  };
}
