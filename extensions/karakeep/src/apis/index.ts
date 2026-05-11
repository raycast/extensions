import { logger } from "@chrismessina/raycast-logger";
import { ApiResponse, Backup, Bookmark, GetBookmarksParams, Highlight, List, Tag, UserStats } from "../types";
import { getApiConfig } from "../utils/config";

const log = logger.child("[API]");

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function fetchWithAuth<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { apiUrl, apiKey } = await getApiConfig();
  const url = new URL(path, apiUrl);
  const method = options.method || "GET";
  log.log(`${method} ${path}`);
  const done = log.time(`${method} ${path}`);

  const response = await fetch(url.toString(), {
    method,
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
    log.error(`${method} ${path} failed`, { status: response.status, body: data });
    let message = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(data);
      const issue = parsed?.error?.issues?.[0]?.message;
      if (issue) {
        message = issue;
      } else if (parsed?.message) {
        message = parsed.message;
      } else if (parsed?.error && typeof parsed.error === "string") {
        message = parsed.error;
      }
    } catch {
      // body is not JSON, use status only
    }
    throw new Error(message);
  }

  done({ status: response.status });

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
  type,
  limit = 10,
}: GetBookmarksParams = {}): Promise<ApiResponse<Bookmark>> {
  const params = new URLSearchParams();
  if (cursor != null) params.append("cursor", cursor);
  if (favourited) params.append("favourited", favourited.toString());
  if (archived) params.append("archived", archived.toString());
  if (type) params.append("type", type);
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

export async function fetchCreateList(payload: {
  name: string;
  icon?: string;
  description?: string;
  parentId?: string;
  type?: "manual" | "smart";
  query?: string;
}): Promise<List> {
  return fetchWithAuth<List>("/api/v1/lists", {
    method: "POST",
    body: payload,
  });
}

export async function fetchUpdateList(
  id: string,
  payload: {
    name?: string;
    icon?: string;
    description?: string;
    parentId?: string | null;
    type?: "manual" | "smart";
    query?: string;
  },
): Promise<List> {
  return fetchWithAuth<List>(`/api/v1/lists/${id}`, {
    method: "PATCH",
    body: payload,
  });
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

export async function fetchCreateTag(payload: { name: string }): Promise<Tag> {
  return fetchWithAuth<Tag>("/api/v1/tags", {
    method: "POST",
    body: payload,
  });
}

export async function fetchUpdateTag(id: string, payload: { name: string }): Promise<Tag> {
  return fetchWithAuth<Tag>(`/api/v1/tags/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function fetchDeleteTag(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/tags/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGetAllHighlights(): Promise<ApiResponse<Highlight>> {
  return fetchWithAuth<ApiResponse<Highlight>>("/api/v1/highlights");
}

export async function fetchUpdateHighlight(
  id: string,
  payload: { text?: string; note?: string; color?: string },
): Promise<Highlight> {
  return fetchWithAuth<Highlight>(`/api/v1/highlights/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function fetchDeleteHighlight(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/highlights/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGetUserStats(): Promise<UserStats> {
  return fetchWithAuth<UserStats>("/api/v1/users/me/stats");
}

export async function fetchGetAllBackups(): Promise<{ backups: Backup[] }> {
  return fetchWithAuth<{ backups: Backup[] }>("/api/v1/backups");
}

export async function fetchGetSingleBackup(id: string): Promise<Backup> {
  return fetchWithAuth<Backup>(`/api/v1/backups/${id}`);
}

export async function fetchCreateBackup(): Promise<Backup> {
  return fetchWithAuth<Backup>("/api/v1/backups", { method: "POST" });
}

export async function fetchDeleteBackup(id: string): Promise<unknown> {
  return fetchWithAuth(`/api/v1/backups/${id}`, { method: "DELETE" });
}

export async function fetchGetBackupDownloadUrl(id: string): Promise<string> {
  const { apiUrl } = await getApiConfig();
  const url = new URL(`/api/v1/backups/${id}/download`, apiUrl);
  return url.toString();
}

export async function fetchAttachTagsToBookmark(
  bookmarkId: string,
  tags: Array<{ tagId?: string; tagName?: string; attachedBy?: "ai" | "human" }>,
): Promise<unknown> {
  return fetchWithAuth(`/api/v1/bookmarks/${bookmarkId}/tags`, {
    method: "POST",
    body: { tags },
  });
}

export async function fetchDetachTagsFromBookmark(
  bookmarkId: string,
  tags: Array<{ tagId: string }>,
): Promise<unknown> {
  return fetchWithAuth(`/api/v1/bookmarks/${bookmarkId}/tags`, {
    method: "DELETE",
    body: { tags },
  });
}
