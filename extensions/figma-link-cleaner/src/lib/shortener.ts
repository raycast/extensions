/**
 * URL Shortener API client for fgma.cc
 *
 * Handles communication with the Cloudflare Worker shortener service.
 */

import { getPreferenceValues } from "@raycast/api";

/** Response from the shortener API */
interface ShortenResponse {
  shortUrl: string;
  code: string;
  created: boolean;
  error?: string;
}

/** The shortener API endpoint */
const SHORTENER_API = "https://fgma.cc/api/shorten";

/**
 * Check if URL shortening is enabled in preferences
 */
export function isShortenerEnabled(): boolean {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.shortenerEnabled ?? false;
  } catch {
    return false;
  }
}

/**
 * Get the API key from preferences
 */
function getApiKey(): string {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.apiKey || "";
  } catch {
    return "";
  }
}

/**
 * Shorten a Figma URL using the fgma.cc service.
 *
 * @param url - The cleaned Figma URL to shorten
 * @returns The shortened URL (e.g., "https://fgma.cc/abc123")
 * @throws Error if the API request fails
 */
export async function shortenUrl(url: string): Promise<string> {
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add auth header if API key is configured
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(SHORTENER_API, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = (await response.json()) as { error?: string };
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(`Shortener API error: ${errorMessage}`);
  }

  const data = (await response.json()) as ShortenResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  return data.shortUrl;
}

/**
 * Result of the shorten operation
 */
export interface ShortenResult {
  /** The final URL (shortened or cleaned) */
  finalUrl: string;
  /** Whether the URL was shortened (vs just cleaned) */
  wasShortened: boolean;
  /** Human-readable message */
  message: string;
}

/**
 * Attempt to shorten a URL, falling back to the cleaned URL on failure.
 *
 * @param cleanedUrl - The already-cleaned Figma URL
 * @returns Result with the final URL and status
 */
export async function tryShortenUrl(
  cleanedUrl: string,
): Promise<ShortenResult> {
  // Check if shortening is enabled
  if (!isShortenerEnabled()) {
    return {
      finalUrl: cleanedUrl,
      wasShortened: false,
      message: "Shortening disabled",
    };
  }

  try {
    const shortUrl = await shortenUrl(cleanedUrl);
    const savedChars = cleanedUrl.length - shortUrl.length;

    return {
      finalUrl: shortUrl,
      wasShortened: true,
      message: `fgma.cc (${savedChars} chars shorter)`,
    };
  } catch (error) {
    // Log the error but don't fail - return the cleaned URL instead
    console.error("Shortener error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      finalUrl: cleanedUrl,
      wasShortened: false,
      message: `Shortening failed: ${errorMessage}`,
    };
  }
}
