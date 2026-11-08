import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";

export const APP_URL = "https://app.solmarrow.com";
export const API_URL = `${APP_URL}/api/v1`;
export const CLIENT_ID = "smp_raycast";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "SolMarrow",
  providerIcon: "extension-icon.png",
  providerId: "solmarrow",
  description: "Connect your SolMarrow account to schedule posts from Raycast.",
});

export const solmarrow = new OAuthService({
  client,
  clientId: CLIENT_ID,
  scope: "solmarrow",
  authorizeUrl: `${APP_URL}/oauth/authorize`,
  tokenUrl: `${APP_URL}/oauth/token`,
  refreshTokenUrl: `${APP_URL}/oauth/token`,
  bodyEncoding: "url-encoded",
  extraParameters: { resource: API_URL },
});

export type Workspace = { id: string; name: string; timezone?: string };
export type Account = {
  id: string;
  network: string;
  network_name?: string;
  name: string;
  handle?: string | null;
  status?: string;
};
export type PostAccount = {
  account_id: string;
  network: string;
  name?: string;
  status?: string;
  url?: string | null;
  error?: string | null;
};
export type Post = {
  id: string;
  text?: string;
  status: string;
  scheduled_at?: string | null;
  scheduled_local?: string | null;
  published_at?: string | null;
  accounts?: PostAccount[];
};
export type CreatePostBody = {
  text: string;
  account_ids: string[];
  media_ids: string[];
  draft?: boolean;
  schedule_at?: string;
};
export type CreatedPost = {
  post_id: string;
  status: string;
  scheduled_local?: string | null;
  timezone?: string;
  calendar_url?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

/** One call to the SolMarrow REST API. SolMarrow's own error message is passed on as is. */
export async function request<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
  fetchImpl: Fetch = fetch,
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {}))
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const res = await fetchImpl(url.toString(), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new ApiError(message || `SolMarrow answered ${res.status}. Try again in a moment.`, res.status);
  }
  return data as T;
}

const seg = encodeURIComponent;

export function api(token = getAccessToken().token, fetchImpl: Fetch = fetch) {
  return {
    workspaces: () =>
      request<{ workspaces: Workspace[] }>(token, "/workspaces", {}, fetchImpl).then((r) => r.workspaces ?? []),
    accounts: (workspaceId: string) =>
      request<{ accounts: Account[] }>(token, `/workspaces/${seg(workspaceId)}/accounts`, {}, fetchImpl).then(
        (r) => r.accounts ?? [],
      ),
    posts: (workspaceId: string, query: { status?: string; from?: string; limit?: number }) =>
      request<{ posts: Post[] }>(token, `/workspaces/${seg(workspaceId)}/posts`, { query }, fetchImpl).then(
        (r) => r.posts ?? [],
      ),
    createPost: (workspaceId: string, body: CreatePostBody) =>
      request<CreatedPost>(token, `/workspaces/${seg(workspaceId)}/posts`, { method: "POST", body }, fetchImpl),
    mediaFromUrl: (workspaceId: string, url: string) =>
      request<{ media_id: string }>(
        token,
        `/workspaces/${seg(workspaceId)}/media/from-url`,
        { method: "POST", body: { url } },
        fetchImpl,
      ),
    deletePost: (postId: string) =>
      request<{ deleted: boolean }>(token, `/posts/${seg(postId)}`, { method: "DELETE" }, fetchImpl),
  };
}
