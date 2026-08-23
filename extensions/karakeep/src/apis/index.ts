import { logger } from "@chrismessina/raycast-logger";
import { ApiResponse, Backup, Bookmark, GetBookmarksParams, Highlight, List, Tag, UserStats } from "../types";
import { getApiConfig } from "../utils/config";
import { describeConnectionError, getConnectionErrorCode, isConnectionError } from "../utils/connection";
import { toErrorMessage } from "../utils/toast";

const log = logger.child("[API]");

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface FetchResult<T> {
  data: T;
  status: number;
}

export interface CreateBookmarkResult {
  bookmark: Bookmark;
  wasCreated: boolean;
}

interface ZodIssue {
  path?: (string | number)[];
  message?: string;
}

/**
 * Turn an error body into something a toast can actually show. Karakeep
 * serializes validation failures as `{ error: { name: "ZodError", message } }`
 * where `message` is itself a JSON string holding the issue array — so the
 * useful part is two levels of encoding deep, and reading `error.issues`
 * alone leaves you with a bare "HTTP 400".
 */
function describeApiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);

    // The /api/trpc endpoints (search, summarize) answer a `batch=1` request
    // with a top-level ARRAY, so the error hides one index deeper and under a
    // `json` envelope. Reading `parsed.error` on an array yields undefined,
    // which is how these two commands ended up reporting a bare status code.
    const entry = Array.isArray(parsed) ? parsed[0] : parsed;
    const err = entry?.error?.json ?? entry?.error;

    let issues: ZodIssue[] | undefined = Array.isArray(err?.issues) ? err.issues : undefined;
    if (!issues && typeof err?.message === "string") {
      try {
        const nested = JSON.parse(err.message);
        if (Array.isArray(nested)) issues = nested;
      } catch {
        // error.message is prose, not encoded issues — handled below.
      }
    }

    const described = issues
      ?.map((issue) => (issue.path?.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .filter(Boolean);
    if (described?.length) return described.join("; ");

    if (typeof err === "string") return err;
    if (typeof err?.message === "string") return err.message;
    if (typeof entry?.message === "string") return entry.message;
  } catch {
    // body is not JSON, fall through to the status line
  }
  return `HTTP ${status}`;
}

export async function fetchWithAuth<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const result = await fetchWithAuthResult<T>(path, options);
  return result.data;
}

async function fetchWithAuthResult<T>(path: string, options: FetchOptions = {}): Promise<FetchResult<T>> {
  const { apiUrl, apiKey } = await getApiConfig();
  const url = new URL(path, apiUrl);
  const method = options.method || "GET";
  log.log(`${method} ${path}`);
  const done = log.time(`${method} ${path}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Raycast Extension",
        Authorization: `Bearer ${apiKey}`,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    // A transport failure rejects with `TypeError: fetch failed`, which carries
    // no detail and serializes to `{}` — logging it raw loses the cause
    // entirely. Log the real code and re-throw the ORIGINAL error so callers
    // can still inspect `error.cause` via isConnectionError().
    if (isConnectionError(error)) {
      // `errorCode`, not `code`. raycast-logger 1.2.x masked any key named
      // `code` as a 2FA code, which is how ECONNREFUSED went missing from the
      // logs. 1.3.0's head-noun matching no longer does that, but the explicit
      // name is clearer about what this holds and cannot regress.
      done({ error: "connection" });
      log.error(`${method} ${path} could not connect`, {
        errorCode: getConnectionErrorCode(error) ?? "unknown",
        detail: describeConnectionError(error, apiUrl),
      });
    } else {
      done({ error: "request" });
      log.error(`${method} ${path} request failed`, { error: toErrorMessage(error) });
    }
    throw error;
  }

  const data = await response.text();

  if (!response.ok) {
    // Closed here as well as on success: the failure cases are the ones whose
    // timing you actually want when diagnosing a slow or hanging server.
    done({ status: response.status });
    log.error(`${method} ${path} failed`, { status: response.status, body: data });
    throw new Error(describeApiError(data, response.status));
  }

  done({ status: response.status });

  try {
    return { data: JSON.parse(data) as T, status: response.status };
  } catch {
    return { data: data as T, status: response.status };
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
  const result = await fetchCreateBookmarkResult(payload);
  return result.bookmark;
}

export async function fetchCreateBookmarkResult(payload: object): Promise<CreateBookmarkResult> {
  const result = await fetchWithAuthResult<Bookmark>("/api/v1/bookmarks", {
    method: "POST",
    body: payload,
  });
  return { bookmark: result.data, wasCreated: result.status === 201 };
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
  /** Required by the API (`z.string()`), not optional — omitting it is a 400. */
  icon: string;
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
