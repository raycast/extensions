import { Cache } from "@raycast/api";
import fetch from "node-fetch";
import { getReadwiseToken } from "./preferences";
export { hasReadwiseToken } from "./preferences";

const cache = new Cache();
const CACHE_KEY = "readwise-saved-urls";

export type SaveResult = {
  success: boolean;
  message: string;
  error?: string;
  isRateLimited?: boolean;
};

/**
 * Saves an article to Readwise Reader.
 *
 * Uses the Readwise Reader API (https://readwise.io/reader_api).
 * Requires a Readwise API token to be configured in preferences.
 *
 * @param url - The URL of the article to save
 * @returns A SaveResult object with the result of the operation
 */
export async function saveToReadwise(url: string): Promise<SaveResult> {
  try {
    const token = getReadwiseToken();
    if (!token) {
      return {
        success: false,
        message: "Readwise API token not configured",
        error: "Please configure your Readwise API token in preferences"
      };
    }

    const response = await fetch("https://readwise.io/api/v3/save/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        url: url,
        saved_using: "raycast-hacker-news",
        location: "new",
        category: "article",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Readwise rate limit exceeded");
        return {
          success: false,
          message: "Rate limit exceeded",
          isRateLimited: true
        };
      } else {
        console.error("Error saving to Readwise, status:", response.status);
        return {
          success: false,
          message: "Failed to save to Readwise Reader",
          error: `HTTP error ${response.status}`
        };
      }
    }

    addSavedUrl(url);
    return {
      success: true,
      message: "Saved to Readwise Reader"
    };
  } catch (error) {
    console.error("Error saving to Readwise:", error);
    return {
      success: false,
      message: "Failed to save to Readwise Reader",
      error: String(error)
    };
  }
}

/**
 * Checks if a URL has been saved to Readwise Reader
 *
 * @param url - The URL to check
 * @returns true if the URL has been saved, false otherwise
 */
export function isUrlSaved(url: string): boolean {
  const savedUrls = getSavedUrls();
  return savedUrls.includes(url);
}

/**
 * Gets the list of saved URLs from the cache
 *
 * @returns An array of saved URLs
 */
export function getSavedUrls(): string[] {
  const cached = cache.get(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

/**
 * Adds a URL to the list of saved URLs in the cache
 *
 * @param url - The URL to add
 */
function addSavedUrl(url: string) {
  const urls = getSavedUrls();
  if (!urls.includes(url)) {
    urls.push(url);
    cache.set(CACHE_KEY, JSON.stringify(urls));
  }
}
