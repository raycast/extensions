import { getPreferenceValues } from "@raycast/api";
import { Bookmark } from "../types";

export type SearchResult = {
  bookmark: Bookmark;
  matchType: "exact" | "domain" | "title";
} | null;

export async function searchForExistingBookmark(link: string): Promise<SearchResult> {
  const preferences = getPreferenceValues<Preferences>();

  // Extract domain from the link
  let domain = "";
  try {
    const url = new URL(link);
    domain = url.hostname;
  } catch (e) {
    console.error("Invalid URL provided:", link);
    return null;
  }

  // Priority 1: Search by exact link
  const exactLinkResults = await searchBookmarks(`link:"${link}"`);
  if (exactLinkResults.length > 0) {
    return { bookmark: exactLinkResults[0], matchType: "exact" };
  }

  // Priority 2: Search by domain
  const domainResults = await searchBookmarks(`domain:"${domain}"`);
  if (domainResults.length > 0) {
    // Sort by creation date to get the most recent one first
    domainResults.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return { bookmark: domainResults[0], matchType: "domain" };
  }

  // Priority 3: Search by title (extract title from link if not available)
  const titleFromLink = extractTitleFromUrl(link);
  if (titleFromLink) {
    const titleResults = await searchBookmarks(`title:"${titleFromLink}"`);
    if (titleResults.length > 0) {
      return { bookmark: titleResults[0], matchType: "title" };
    }
  }

  return null;
}

async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const preferences = getPreferenceValues<Preferences>();

  const url = new URL("https://api.raindrop.io/rest/v1/raindrops/0"); // Search all collections
  url.searchParams.set("search", query);
  url.searchParams.set("perpage", "10"); // Limit to 10 results to avoid unnecessary data

  try {
    const response = await fetch(url.href, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} (${response.statusText})`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching bookmarks:", error);
    return [];
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    // Extract potential title from the path
    const pathParts = urlObj.pathname.split("/").filter((part) => part.length > 0);
    if (pathParts.length > 0) {
      // Use the last path segment as potential title
      return pathParts[pathParts.length - 1].replace(/[-_]/g, " ");
    }
    return hostname;
  } catch (e) {
    return "";
  }
}
