import { Cache, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { getReadwiseToken } from "./preferences";
export { hasReadwiseToken } from "./preferences";

const cache = new Cache();
const CACHE_KEY = "readwise-saved-urls";

/**
 * Saves an article to Readwise Reader.
 *
 * Uses the Readwise Reader API (https://readwise.io/reader_api).
 * Requires a Readwise API token to be configured in preferences.
 *
 * @param url - The URL of the article to save
 */
export async function saveToReadwise(url: string) {
  try {
    const token = getReadwiseToken();
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
        await showToast({
          style: Toast.Style.Failure,
          title: "Rate limit exceeded",
          message: "Please try again later",
        });
      } else {
        console.error("Error saving to Readwise, status:", response.status);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save to Readwise Reader",
        });
      }
      return;
    }
    addSavedUrl(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to Readwise Reader",
    });
  } catch (error) {
    console.error("Error saving to Readwise:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save to Readwise Reader",
      message: String(error),
    });
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
function getSavedUrls(): string[] {
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
