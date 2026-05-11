import { Cache } from "@raycast/api";
import { getReadwiseToken } from "./preferences";
export { hasReadwiseToken } from "./preferences";

const cache = new Cache();
const CACHE_KEY = "readwise-saved-urls";
// Maximum number of URLs to store in the cache
const MAX_CACHE_SIZE = 100;

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
        error: "Please configure your Readwise API token in preferences",
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
          isRateLimited: true,
        };
      } else {
        console.error("Error saving to Readwise, status:", response.status);
        return {
          success: false,
          message: "Failed to save to Readwise Reader",
          error: `HTTP error ${response.status}`,
        };
      }
    }

    // Article was successfully saved to Readwise, now update local cache
    const cacheUpdateSuccessful = addUrlToLocalCache(url);
    if (!cacheUpdateSuccessful) {
      return {
        success: true,
        message: "Saved to Readwise Reader",
        error: "Note: Failed to update local cache. The article was saved but may not appear in your saved list.",
      };
    }

    return {
      success: true,
      message: "Saved to Readwise Reader",
    };
  } catch (error) {
    console.error("Error saving to Readwise:", error);
    return {
      success: false,
      message: "Failed to save to Readwise Reader",
      error: String(error),
    };
  }
}

/**
 * Checks if a URL has been saved to Readwise Reader based on local cache
 *
 * @param url - The URL to check
 * @returns true if the URL has been saved according to local cache, false otherwise
 */
export function isUrlSaved(url: string): boolean {
  const savedUrls = getUrlsFromLocalCache();
  return savedUrls.includes(url);
}

/**
 * Gets the list of saved URLs from the local cache
 *
 * @returns An array of saved URLs from local cache
 */
export function getSavedUrls(): string[] {
  return getUrlsFromLocalCache();
}

/**
 * Gets the list of saved URLs from the local cache
 *
 * @returns An array of saved URLs from local cache
 */
function getUrlsFromLocalCache(): string[] {
  try {
    const cached = cache.get(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error("Error retrieving saved URLs from local cache:", error);
    return [];
  }
}

/**
 * Adds a URL to the list of saved URLs in the local cache
 * Maintains a maximum cache size by removing oldest entries when needed (FIFO)
 *
 * @param url - The URL to add to local cache
 * @returns true if the URL was successfully added to local cache or already exists, false if there was an error
 */
function addUrlToLocalCache(url: string): boolean {
  try {
    const urls = getUrlsFromLocalCache();
    // Only add if not already in the cache
    if (!urls.includes(url)) {
      // Append new URL
      urls.push(url);
      // If we exceed the maximum cache size, remove the oldest entries (from the beginning)
      if (urls.length > MAX_CACHE_SIZE) {
        urls.splice(0, urls.length - MAX_CACHE_SIZE);
      }
      const serializedUrls = JSON.stringify(urls);
      cache.set(CACHE_KEY, serializedUrls);
    }
    return true;
  } catch (error) {
    console.error("Error adding URL to local cache:", error);
    return false;
  }
}
