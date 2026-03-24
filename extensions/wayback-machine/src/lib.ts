import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// =============================================================================
// Constants
// =============================================================================

export const WAYBACK_BASE_URL = "https://web.archive.org";
export const WAYBACK_API_URL = "https://archive.org/wayback/available";

// =============================================================================
// Types
// =============================================================================

/**
 * Response from the Wayback Machine availability API.
 */
export interface WaybackSnapshot {
  url: string;
  available: boolean;
}

// =============================================================================
// URL Utilities
// =============================================================================

const urlRegexPattern =
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;

/**
 * Validates if a string is a valid URL.
 * @param {string} text - The string to validate.
 * @returns {boolean} - True if the string is a valid http/https URL.
 */
export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by adding https:// protocol if missing.
 * @param {string} url - A URL that may be missing a protocol.
 * @returns {string} - The normalized URL with protocol.
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extracts URLs found in a block of text.
 * @param {string} text - A block of text that may contain URLs.
 * @param {number} limit - Maximum number of URLs to extract. Default 1 (first URL only). Use 0 for all URLs.
 * @returns {string[]} - An array of extracted URLs, normalized with protocols.
 */
export function extractUrls(text: string, limit: number = 1): string[] {
  const matches = text.match(urlRegexPattern);
  if (!matches) return [];
  const urls = limit === 0 ? matches : matches.slice(0, limit);
  return urls.map(normalizeUrl);
}

/**
 * Converts a string of URLs separated by newlines into an array of valid URLs.
 * Expects clean input (URLs only, one per line).
 * @param {string} urlString - A string containing URLs separated by newlines.
 * @returns {string[]} An array of valid URLs.
 */
export function urlsToArray(urlString: string): string[] {
  let urls = urlString.split("\n");

  // remove empty lines
  urls = urls.filter((url) => url.trim() !== "");
  // validate each url and remove invalid urls
  urls = urls.filter((url) => isValidUrl(url.trim()));

  return urls;
}

// =============================================================================
// Wayback Machine API
// =============================================================================

/**
 * Checks if a snapshot exists for the given URL in the Wayback Machine.
 * @param {string} webpageUrl - The URL to check for archived snapshots.
 * @returns {Promise<WaybackSnapshot | null>} - The snapshot info if available, or null if not found or on error.
 */
export async function checkSnapshot(webpageUrl: string): Promise<WaybackSnapshot | null> {
  try {
    const res = await fetch(`${WAYBACK_API_URL}?url=${webpageUrl}`);

    if (res.status >= 400) {
      console.error(`Wayback API error: ${res.status} for URL: ${webpageUrl}`);
      return null;
    }

    const archive = (await res.json()) as {
      archived_snapshots?: {
        closest?: {
          url: string;
          available: boolean;
        };
      };
    };

    if (archive.archived_snapshots?.closest?.url) {
      return {
        url: archive.archived_snapshots.closest.url,
        available: archive.archived_snapshots.closest.available ?? true,
      };
    }

    return null;
  } catch (err) {
    console.error("Error checking Wayback snapshot:", err);
    return null;
  }
}

/**
 * Saves a webpage to the Wayback Machine.
 * @param {string} webpageUrl - The URL of the webpage to save.
 * @returns {Promise<void>} - A promise that resolves when the webpage has been saved.
 */
export async function savePage(webpageUrl: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Wayback Machine" });

  try {
    const res = await fetch(`${WAYBACK_BASE_URL}/save/${webpageUrl}`);

    if (res.status >= 400) {
      await showFailureToast("Failed to save to Wayback Machine");
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Saved to Wayback Machine";
  } catch (err) {
    await showFailureToast(err, { title: "Failed to save to Wayback Machine" });
  }
}
