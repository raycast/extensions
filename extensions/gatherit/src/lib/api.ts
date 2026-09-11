import { getToken, signOut } from "./oauth";
import { getApiToken, getBaseUrl } from "./preferences";

// Mirrors the `/api/v1` RaycastReference DTO (src/lib/raycast/dto.ts).
export interface GatherReference {
  id: string;
  title: string;
  description: string;
  tags: string[];
  elements: string[];
  categories: string[];
  sourceUrl: string | null;
  domain: string | null;
  /** Presigned R2 URL (expires); null when the reference has no image yet. */
  imageUrl: string | null;
  width: number;
  height: number;
  createdAt: string;
  imageCount: number;
  appUrl: string;
  /** Canonical "Copy for AI" prompt, rendered server-side; copy verbatim. */
  aiPrompt: string;
}

export interface GatherCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface UsageInfo {
  current: number;
  limit: number | null;
}

export interface SearchResult {
  items: GatherReference[];
  nextCursor: string | null;
  nextOffset: number | null;
  totalCount?: number;
  usage?: UsageInfo;
}

export interface SearchParams {
  query?: string;
  categoryId?: string;
  tags?: string[];
  kind?: "all" | "images" | "links" | "videos";
  sort?: "newest" | "oldest";
  limit?: number;
  cursor?: string | null;
  offset?: number;
}

export class GatherApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GatherApiError";
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let code = "request_failed";
    let message = `Request failed (${res.status})`;
    let extra: Record<string, unknown> | undefined;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body.error === "string") code = body.error;
      if (typeof body.message === "string") message = body.message;
      extra = body;
    } catch {
      // non-JSON error body — keep defaults
    }
    if (res.status === 401) {
      code = "unauthenticated";
      message = "Not signed in to Gather. Run the command again to connect.";
      // The token the server just rejected is invalid server-side (revoked
      // session, password change, etc.). getToken() only checks the local
      // expiry timestamp, so without clearing it we'd hand back the same dead
      // token on every relaunch and 401 forever. Drop the stored OAuth tokens
      // so the next run falls through to a fresh PKCE flow automatically.
      // Skip when a static API token is in use (dev/self-host): signOut can't
      // fix a bad preference and we shouldn't wipe unrelated OAuth tokens.
      if (!getApiToken()) await signOut();
    }
    throw new GatherApiError(res.status, code, message, extra);
  }

  return res.json();
}

function buildSearchQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.query) sp.set("q", params.query);
  if (params.categoryId) sp.set("categoryId", params.categoryId);
  if (params.kind && params.kind !== "all") sp.set("kind", params.kind);
  if (params.sort) sp.set("sort", params.sort);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);
  if (typeof params.offset === "number")
    sp.set("offset", String(params.offset));
  for (const tag of params.tags ?? []) sp.append("tag", tag);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function searchReferences(
  params: SearchParams = {},
): Promise<SearchResult> {
  return (await request(
    `/api/v1/references${buildSearchQuery(params)}`,
  )) as SearchResult;
}

export async function getReference(id: string): Promise<GatherReference> {
  const body = (await request(
    `/api/v1/references/${encodeURIComponent(id)}`,
  )) as {
    reference: GatherReference;
  };
  return body.reference;
}

export async function listCategories(): Promise<GatherCategory[]> {
  const body = (await request(`/api/v1/categories`)) as {
    categories: GatherCategory[];
  };
  return body.categories;
}

/** Save a link/image URL. Returns the created reference, or throws GatherApiError. */
export async function saveReferenceUrl(
  url: string,
  options?: { categoryId?: string; force?: boolean },
): Promise<{ id: string }> {
  const form = new FormData();
  form.append("url", url);
  if (options?.categoryId) form.append("categoryId", options.categoryId);
  const qs = options?.force ? "?force=true" : "";
  return (await request(`/api/v1/references${qs}`, {
    method: "POST",
    body: form,
  })) as { id: string };
}
