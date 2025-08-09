import { getPreferenceValues, showToast, Toast } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

interface Bookmark {
  id: string;
  url: string;
  title: string;
  summary?: string;
  type: string;
  status: string;
  starred: boolean;
  read: boolean;
  preview?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  ogDescription?: string;
  createdAt: string;
  metadata?: {
    author?: string;
    publishDate?: string;
  };
  matchedTags?: string[];
  score?: number;
  matchType?: string;
}

interface CreateBookmarkResponse {
  success: boolean;
  bookmark?: Bookmark;
  error?: string;
}

interface ListBookmarksResponse {
  success: boolean;
  bookmarks: Bookmark[];
  hasMore: boolean;
  nextCursor?: string;
  error?: {
    code: string;
    message: string;
  };
}

const API_BASE_URL = "https://saveit.now/api/v1";

export function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
}

export async function createBookmark(url: string): Promise<Bookmark | null> {
  try {
    const apiKey = getApiKey();

    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = (await response.json()) as CreateBookmarkResponse;

    if (!response.ok) {
      if (response.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: "Please check your API key in preferences",
        });
        return null;
      }
      if (response.status === 409) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Bookmark Already Exists",
          message: "This URL is already saved",
        });
        return null;
      }
      throw new Error(`Failed to create bookmark: ${response.statusText}`);
    }

    if (data.success && data.bookmark) {
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark Saved",
        message: data.bookmark.title || "Successfully saved to SaveIt.now",
      });
      return data.bookmark;
    }

    throw new Error(data.error || "Failed to create bookmark");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Save Bookmark",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

interface ListBookmarksOptions {
  query?: string;
  tags?: string[];
  types?: string[];
  special?: "READ" | "UNREAD" | "STAR";
  limit?: number;
  cursor?: string;
}

export async function listBookmarks(options: ListBookmarksOptions = {}): Promise<Bookmark[]> {
  try {
    const apiKey = getApiKey();

    const params = new URLSearchParams();
    if (options.query) {
      params.append("query", options.query);
    }
    if (options.tags && options.tags.length > 0) {
      params.append("tags", options.tags.join(","));
    }
    if (options.types && options.types.length > 0) {
      params.append("types", options.types.join(","));
    }
    if (options.special) {
      params.append("special", options.special);
    }
    params.append("limit", (options.limit || 20).toString());
    if (options.cursor) {
      params.append("cursor", options.cursor);
    }

    const url = `${API_BASE_URL}/bookmarks?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: "Please check your API key in preferences",
        });
        return [];
      }
      throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
    }

    const data = (await response.json()) as ListBookmarksResponse;

    if (!data.success) {
      throw new Error(data.error?.message || "Failed to fetch bookmarks");
    }

    return data.bookmarks;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Bookmarks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
