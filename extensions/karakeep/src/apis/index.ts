import { ApiResponse, Bookmark, GetBookmarksParams, List, Tag } from "../types";
import { getApiConfig } from "../utils/config";

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function fetchWithAuth<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
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
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
}

export async function fetchSearchBookmarks(searchText: string): Promise<unknown> {
  const input = encodeURIComponent(
    JSON.stringify({
      "0": { json: { text: searchText } },
    }),
  );
  return fetchWithAuth(`/api/trpc/bookmarks.searchBookmarks?batch=1&input=${input}`);
}

export async function fetchSummarizeBookmark(bookmarkId: string): Promise<unknown> {
  return fetchWithAuth(`/api/trpc/bookmarks.summarizeBookmark?batch=1`, {
    method: "POST",
    body: {
      "0": {
        json: { bookmarkId },
      },
    },
  });
}

export async function fetchGetAllBookmarks({
  cursor,
  favourited,
  archived,
  limit = 10,
}: GetBookmarksParams = {}): Promise<ApiResponse<Bookmark>> {
  const params = new URLSearchParams();
  if (cursor != null) params.append("cursor", cursor);
  if (favourited) params.append("favourited", favourited.toString());
  if (archived) params.append("archived", archived.toString());
  if (limit) params.append("limit", limit.toString());

  const queryString = params.toString();
  return fetchWithAuth(`/api/v1/bookmarks${queryString ? `?${queryString}` : ""}`);
}

export async function fetchCreateBookmark(payload: object): Promise<Bookmark> {
  return fetchWithAuth<Bookmark>("/api/v1/bookmarks", {
    method: "POST",
    body: payload,
  });
}

export async function fetchGetSingleBookmark(id: string): Promise<Bookmark> {
  return fetchWithAuth<Bookmark>(`/api/v1/bookmarks/${id}`);
}

export async function fetchDeleteBookmark(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/bookmarks/${id}`, {
    method: "DELETE",
  });
}

export async function fetchUpdateBookmark(id: string, options: unknown): Promise<Bookmark> {
  return fetchWithAuth<Bookmark>(`/api/v1/bookmarks/${id}`, {
    method: "PATCH",
    body: options,
  });
}

export async function fetchGetAllLists(): Promise<ApiResponse<List>> {
  return fetchWithAuth<ApiResponse<List>>("/api/v1/lists");
}

export async function fetchGetSingleList(id: string): Promise<List> {
  return fetchWithAuth<List>(`/api/v1/lists/${id}`);
}

export async function fetchAddBookmarkToList(listId: string, bookmarkId: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/lists/${listId}/bookmarks/${bookmarkId}`, {
    method: "PUT",
  });
}

export async function fetchGetSingleListBookmarks(
  id: string,
  cursor?: string,
  limit: number = 10,
): Promise<ApiResponse<Bookmark>> {
  const params = new URLSearchParams();
  if (cursor != null) params.append("cursor", cursor);
  if (limit) params.append("limit", limit.toString());
  const queryString = params.toString();
  return fetchWithAuth<ApiResponse<Bookmark>>(`/api/v1/lists/${id}/bookmarks${queryString ? `?${queryString}` : ""}`);
}

export async function fetchDeleteList(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/lists/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGetAllTags(): Promise<ApiResponse<Tag>> {
  return fetchWithAuth<ApiResponse<Tag>>("/api/v1/tags");
}

export async function fetchGetSingleTagBookmarks(
  id: string,
  cursor?: string,
  limit: number = 10,
): Promise<ApiResponse<Bookmark>> {
  const params = new URLSearchParams();
  if (cursor != null) params.append("cursor", cursor);
  if (limit) params.append("limit", limit.toString());
  const queryString = params.toString();
  return fetchWithAuth<ApiResponse<Bookmark>>(`/api/v1/tags/${id}/bookmarks${queryString ? `?${queryString}` : ""}`);
}

export async function fetchDeleteTag(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/tags/${id}`, {
    method: "DELETE",
  });
}
