import fetch from "node-fetch";
import { URL } from "url";
import { GetBookmarksParams } from "../types";
import { getApiConfig } from "../utils/config";

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function fetchWithAuth(path: string, options: FetchOptions = {}): Promise<unknown> {
  const { apiUrl, apiKey } = await getApiConfig();
  const url = new URL(path, apiUrl);
  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Raycast Extension",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${data}`);
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export async function fetchSearchBookmarks(searchText: string) {
  const input = encodeURIComponent(
    JSON.stringify({
      "0": { json: { text: searchText } },
    }),
  );
  return fetchWithAuth(`/api/trpc/bookmarks.searchBookmarks?batch=1&input=${input}`);
}

export async function fetchSummarizeBookmark(bookmarkId: string) {
  return fetchWithAuth(`/api/trpc/bookmarks.summarizeBookmark?batch=1`, {
    method: "POST",
    body: {
      "0": {
        json: { bookmarkId },
      },
    },
  });
}

export async function fetchGetAllBookmarks({ cursor, favourited, archived }: GetBookmarksParams = {}) {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  if (favourited) params.append("favourited", favourited.toString());
  if (archived) params.append("archived", archived.toString());

  const queryString = params.toString();
  return fetchWithAuth(`/api/v1/bookmarks${queryString ? `?${queryString}` : ""}`);
}

export async function fetchCreateBookmark(payload: object) {
  return fetchWithAuth("/api/v1/bookmarks", {
    method: "POST",
    body: payload,
  });
}

export async function fetchGetSingleBookmark(id: string) {
  return fetchWithAuth(`/api/v1/bookmarks/${id}`);
}

export async function fetchDeleteBookmark(id: string) {
  return fetchWithAuth(`/api/v1/bookmarks/${id}`, {
    method: "DELETE",
  });
}

export async function fetchUpdateBookmark(id: string, options: unknown) {
  return fetchWithAuth(`/api/v1/bookmarks/${id}`, {
    method: "PATCH",
    body: options,
  });
}

export async function fetchGetAllLists() {
  return fetchWithAuth("/api/v1/lists");
}

export async function fetchGetSingleList(id: string) {
  return fetchWithAuth(`/api/v1/lists/${id}`);
}

export async function fetchAddBookmarkToList(listId: string, bookmarkId: string) {
  return fetchWithAuth(`/api/v1/lists/${listId}/bookmarks/${bookmarkId}`, {
    method: "PUT",
  });
}

export async function fetchGetSingleListBookmarks(id: string, cursor?: string) {
  return fetchWithAuth(`/api/v1/lists/${id}/bookmarks${cursor ? `?cursor=${cursor}` : ""}`);
}

export async function fetchDeleteList(id: string) {
  return fetchWithAuth(`/api/v1/lists/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGetAllTags() {
  return fetchWithAuth("/api/v1/tags");
}

export async function fetchGetSingleTagBookmarks(id: string, cursor?: string) {
  return fetchWithAuth(`/api/v1/tags/${id}/bookmarks${cursor ? `?cursor=${cursor}` : ""}`);
}

export async function fetchDeleteTag(id: string) {
  return fetchWithAuth(`/api/v1/tags/${id}`, {
    method: "DELETE",
  });
}
