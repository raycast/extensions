import { BrowserExtension, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { CollectionCreationResponse, FormValues } from "../types";

export async function createCollection({
  preferences,
  title,
}: {
  preferences: Preferences;
  title: string;
}): Promise<CollectionCreationResponse> {
  const response = await fetch("https://api.raindrop.io/rest/v1/collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({ title, parent: { $id: {} } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create collection: ${response.statusText}`);
  }
  return (await response.json()) as CollectionCreationResponse;
}

export async function createBookmark({
  preferences,
  values,
  showCollectionCreation,
}: {
  preferences: Preferences;
  values: FormValues;
  showCollectionCreation: boolean;
}) {
  let collectionId = values.collection;

  if (showCollectionCreation && values.newCollection) {
    collectionId = await createCollection({
      preferences,
      title: values.newCollection,
    }).then((data) => data.item._id.toString());
  }

  return fetch("https://api.raindrop.io/rest/v1/raindrops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    body: JSON.stringify({
      items: values.link.split(/[ ,;]/).map((link) => ({
        link: link.trim(),
        title: values.title,
        collectionId,
        tags: values.tags,
        pleaseParse: {},
      })),
    }),
  });
}

/**
 * Retrieves the title of a web page from the given link.
 *
 * This function attempts to retrieve the title using the following methods in order:
 * 1. Browser Extension API (if available and link matches active tab) - preferred method
 * 2. Direct HTTP fetch - fallback method that fetches the page and parses HTML
 *
 * @param link - The URL to fetch the title from
 * @returns The page title, or an empty string if fetching fails
 */
export async function getLinkTitle(link: string) {
  // Check if Browser Extension API is available
  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active && tab.url === link);

      if (activeTab) {
        // If the link matches the active tab, get title from browser extension
        const title = await BrowserExtension.getContent({
          cssSelector: "title",
          format: "text",
          tabId: activeTab.id,
        });

        if (title.trim()) {
          return title.trim();
        }
      }
    } catch (error) {
      // Fallback to fetch if Browser Extension API fails
      console.warn("Browser Extension API failed for title fetch:", error);
    }
  }

  // Fallback: fetch-based processing
  let url = link.trim();
  if (!url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    const title = match ? match[1] : "";
    return title;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to fetch title" });
    return "";
  }
}
