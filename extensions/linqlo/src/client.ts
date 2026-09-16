export const API_URL = "https://api.linqlo.app/api/integrations/v1";
export const SETTINGS_URL = "https://linqlo.app/settings/integrations";
export interface Bookmark {
  id: string;
  title: string | null;
  url: string;
  domain: string | null;
  tags: string[];
}
export interface Collection {
  id: string;
  title: string;
  count: number;
  parentId: string | null;
  url: string;
}
export interface BookmarkPage {
  bookmarks: Bookmark[];
  hasMore: boolean;
}
export function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export async function request<T>(
  apiKey: string,
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
    redirect: "error",
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  if (response.status === 401)
    throw new Error(
      "Your key expired or was revoked. Create a new key in Linqlo settings and update extension preferences.",
    );
  if (response.status === 403)
    throw new Error(
      "This connection is read-only. Create a key with read and save access to save bookmarks.",
    );
  if (response.status === 429)
    throw new Error(
      `Too many requests. Try again in ${response.headers.get("retry-after") || "60"} seconds.`,
    );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Linqlo request failed (${response.status}).`,
    );
  }
  return (await response.json()) as T;
}
