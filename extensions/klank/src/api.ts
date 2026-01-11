/**
 * API client for Klank Raycast extension
 */

import { getPreferenceValues } from "@raycast/api";
import {
  type Preferences,
  type SearchableItem,
  type SearchAPIResponse,
} from "./types";

/**
 * Get the API URL from preferences
 */
export function getApiUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiUrl || "https://klank.studio";
}

/**
 * Get the access token from preferences
 */
export function getAccessToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.accessToken;
}

/**
 * Fetch searchable items from the Klank API
 */
export async function fetchSearchItems(): Promise<{
  items: SearchableItem[];
  user?: { id: string; email: string };
  error?: string;
}> {
  const apiUrl = getApiUrl();
  const accessToken = getAccessToken();

  if (!accessToken) {
    return {
      items: [],
      error:
        "No access token configured. Please add your Klank access token in the extension preferences.",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/api/raycast/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authorization: `Bearer ${accessToken}`,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          items: [],
          error:
            "Invalid access token. Please check your Klank access token in the extension preferences.",
        };
      }
      return {
        items: [],
        error: `Failed to fetch items: ${response.statusText}`,
      };
    }

    const data: SearchAPIResponse = await response.json();

    if (data.error) {
      return {
        items: [],
        error: data.error,
      };
    }

    return {
      items: data.items || [],
      user: data.user,
    };
  } catch (error) {
    console.error("Failed to fetch search items:", error);
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Build the full URL for an item
 */
export function getItemUrl(item: SearchableItem): string {
  if (!item.url) return "";
  const apiUrl = getApiUrl();
  // If the URL is already absolute, return it
  if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
    return item.url;
  }
  // Otherwise, prepend the API URL
  return `${apiUrl}${item.url}`;
}
