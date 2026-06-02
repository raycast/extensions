import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { operationNameOf } from "./queries-util";

const TOKEN_ENDPOINT = "https://api.producthunt.com/v2/oauth/token";
const GRAPHQL_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";
const TOKEN_CACHE_KEY = "ph_access_token_v1";
// PH's documented token response omits expires_in; cache conservatively and retry-clear on 401/403.
const TOKEN_TTL_MS = 30 * 60 * 1000;

const authLog = logger.child("[ProductHuntAuth]");
const apiLog = logger.child("[ProductHuntAPI]");

export type ApiErrorCategory =
  | "missingCredentials"
  | "invalidCredentials"
  | "rateLimited"
  | "graphql"
  | "network"
  | "unknown";

export class ApiError extends Error {
  category: ApiErrorCategory;
  constructor(category: ApiErrorCategory, message: string) {
    super(message);
    this.name = "ApiError";
    this.category = category;
  }
}

export interface Credentials {
  apiKey: string;
  apiSecret: string;
}

export function hasCredentials(c: Credentials): boolean {
  return Boolean(c.apiKey && c.apiSecret);
}

export function getCredentials(): Credentials {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = (prefs.apiKey ?? "").trim();
  const apiSecret = (prefs.apiSecret ?? "").trim();
  // One present, one missing is a config error, not silent fallback.
  if ((apiKey && !apiSecret) || (!apiKey && apiSecret)) {
    throw new ApiError("missingCredentials", "Both Product Hunt API Key and API Secret are required.");
  }
  return { apiKey, apiSecret };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

async function requestClientToken(creds: Credentials): Promise<string> {
  const done = authLog.time("client_credentials token request");
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: creds.apiKey,
        client_secret: creds.apiSecret,
        grant_type: "client_credentials",
      }),
    });
    done({ status: res.status });
    if (res.status === 401 || res.status === 403) {
      throw new ApiError("invalidCredentials", "Product Hunt rejected the API Key/Secret.");
    }
    if (!res.ok) {
      throw new ApiError("network", `Token request failed with status ${res.status}.`);
    }
    let json: { access_token?: string };
    try {
      json = (await res.json()) as { access_token?: string };
    } catch {
      throw new ApiError("network", `Token response body was not valid JSON (status ${res.status}).`);
    }
    if (!json.access_token) {
      throw new ApiError("unknown", "Token response did not include access_token.");
    }
    return json.access_token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    authLog.error("token request failed", error);
    throw new ApiError("network", error instanceof Error ? error.message : "Token request failed.");
  }
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  const creds = getCredentials();
  if (!hasCredentials(creds)) {
    throw new ApiError("missingCredentials", "No Product Hunt API credentials configured.");
  }
  if (forceRefresh) {
    // A forced refresh (e.g. user updated their keys and hit Refresh) means "re-authenticate from
    // scratch." Drop any cached token first so a token minted from now-stale credentials can never be
    // reused, and so a failed re-auth doesn't leave the old entry behind for the next call to pick up.
    await LocalStorage.removeItem(TOKEN_CACHE_KEY);
  } else {
    const raw = await LocalStorage.getItem<string>(TOKEN_CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachedToken;
        if (cached.token && cached.expiresAt > Date.now()) {
          authLog.debug("using cached access token", { expiresInMs: cached.expiresAt - Date.now() });
          return cached.token;
        }
      } catch {
        // fall through to refresh
      }
    }
  }
  authLog.debug("no valid cached token; requesting new one");
  const token = await requestClientToken(creds);
  const entry: CachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  await LocalStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(entry));
  return token;
}

async function postGraphql(query: string, variables: Record<string, unknown>, token: string): Promise<Response> {
  return fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
}

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  options?: { forceRefresh?: boolean },
): Promise<T> {
  const done = apiLog.time("GraphQL request");
  apiLog.debug("request", { operation: operationNameOf(query), variables });

  // forceRefresh re-authenticates from scratch (clears + re-fetches the OAuth token) before the
  // request, so a Refresh after the user fixes rejected credentials doesn't reuse a stale token.
  let token = await getAccessToken(options?.forceRefresh ?? false);
  let res: Response;
  try {
    res = await postGraphql(query, variables, token);
  } catch (error) {
    apiLog.error("GraphQL network error", error);
    throw new ApiError("network", error instanceof Error ? error.message : "Network error.");
  }

  // Token may be stale despite TTL; refresh once on auth rejection.
  if (res.status === 401 || res.status === 403) {
    await LocalStorage.removeItem(TOKEN_CACHE_KEY);
    apiLog.debug("auth rejected (cleared token cache); retrying once");
    token = await getAccessToken(true);
    try {
      res = await postGraphql(query, variables, token);
    } catch (error) {
      apiLog.error("GraphQL network error (retry)", error);
      throw new ApiError("network", error instanceof Error ? error.message : "Network error.");
    }
  }

  done({
    status: res.status,
    rateLimitRemaining: res.headers.get("X-Rate-Limit-Remaining"),
    rateLimitReset: res.headers.get("X-Rate-Limit-Reset"),
  });

  if (res.status === 429) {
    const reset = res.headers.get("X-Rate-Limit-Reset");
    throw new ApiError("rateLimited", `Rate limited.${reset ? ` Resets in ${reset}s.` : ""}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError("invalidCredentials", "Product Hunt rejected the API credentials.");
  }
  if (!res.ok) {
    throw new ApiError("network", `GraphQL request failed with status ${res.status}.`);
  }

  let json: { data?: T; errors?: Array<{ message: string }> };
  try {
    json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  } catch {
    throw new ApiError("network", `GraphQL response body was not valid JSON (status ${res.status}).`);
  }
  if (json.errors && json.errors.length > 0) {
    throw new ApiError("graphql", json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new ApiError("graphql", "GraphQL response contained no data.");
  }
  apiLog.debug("GraphQL response ok", { operation: operationNameOf(query) });
  return json.data;
}
