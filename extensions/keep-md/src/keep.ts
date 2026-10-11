import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://keep.md/api";
const API_VERSION = "2026-08-24";

export type Bookmark = {
  id: string;
  url?: string | null;
  title: string;
  notes?: string | null;
  tags?: string[];
  tagSlugs?: string[];
  collectionName?: string | null;
  createdAt?: number;
  status?: string;
};

type BookmarkPage = {
  items: Bookmark[];
  count: number;
  limit: number;
  offset: number;
};
type ApiError = { error?: string; message?: string; resolution?: string };

export type ConnectionResult = {
  endpoint: string;
  status?: number;
  error?: string;
};

export async function checkConnection(): Promise<ConnectionResult[]> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return Promise.all(
    ["/me", "/items?limit=1"].map(async (path): Promise<ConnectionResult> => {
      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Keep-API-Version": API_VERSION,
            Accept: "application/json",
          },
        });
        if (response.ok) return { endpoint: path, status: response.status };
        const body = (await response.json().catch(() => ({}))) as ApiError;
        return { endpoint: path, status: response.status, error: body.error };
      } catch (error) {
        return {
          endpoint: path,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Keep-API-Version": API_VERSION,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail: ApiError = {};
    try {
      detail = (await response.json()) as ApiError;
    } catch {
      // Preserve the HTTP status when Keep does not return JSON.
    }
    const message =
      response.status === 403
        ? "Access denied. Keep reports 403 when a credential lacks access or the account plan does not include the feature."
        : response.status === 401
          ? "Invalid API key. Create a new key in Keep Settings → Connections → API and agents."
          : detail.message ||
            detail.resolution ||
            detail.error ||
            response.statusText;
    throw new Error(`Keep ${response.status}: ${message}`);
  }
  return (await response.json()) as T;
}

export function listBookmarks(
  query: string,
  offset = 0,
  signal?: AbortSignal,
): Promise<BookmarkPage> {
  const params = new URLSearchParams({ limit: "50", offset: String(offset) });
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
    return request<BookmarkPage>(`/items/search?${params}`, { signal });
  }
  return request<BookmarkPage>(`/items?${params}`, { signal });
}

export function saveBookmark(
  url: string,
): Promise<{ id: string; url: string; ok: boolean }> {
  return request("/ingest", { method: "POST", body: JSON.stringify({ url }) });
}

export function updateBookmark(
  id: string,
  fields: { title?: string; tags?: string[] },
): Promise<Bookmark> {
  return request(`/items/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

export function archiveBookmark(id: string): Promise<{ archived: number }> {
  return request("/items/archive", {
    method: "POST",
    body: JSON.stringify({ ids: [id] }),
  });
}
