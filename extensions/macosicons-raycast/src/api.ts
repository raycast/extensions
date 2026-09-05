import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";

const FRONT_BASE_URL = "https://macosicons.com";
const BASE_URL = "https://api.macosicons.com";

const API_KEY_KEY = "api-key";

/**
 * The free tier allows 50 API calls per month and a maximum of 2 requests
 * per second. These are surfaced in the UI so users understand the limits
 * and know how to raise them. Keep in sync with the backend
 * (server/api/v1/auth/generateApiKey.ts and the search rate limiter).
 */
export const FREE_TIER = {
  monthlyLimit: 50,
  requestsPerSecond: 2,
  docsUrl: "https://docs.macosicons.com",
} as const;

/** An API key set in Raycast preferences takes priority over the OAuth flow. */
function getPreferenceApiKey(): string | undefined {
  const key = getPreferenceValues<Preferences>().apiKey?.trim();
  return key ? key : undefined;
}

// OAuth PKCE client
export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "macOSicons",
  providerIcon: "extension-logo.png",
  description: "Connect your macOSicons account to search and apply icons.",
});

// API key management
export async function getApiKey(): Promise<string | undefined> {
  // A preference key always wins so power users can bring their own key.
  const preferenceKey = getPreferenceApiKey();
  if (preferenceKey) return preferenceKey;
  return await LocalStorage.getItem<string>(API_KEY_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await LocalStorage.setItem(API_KEY_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_KEY);
}

/**
 * True when the active API key comes from preferences rather than the OAuth
 * flow. In that case sign-in/sign-out actions do not apply.
 */
export function isUsingPreferenceKey(): boolean {
  return getPreferenceApiKey() !== undefined;
}

// OAuth authorization flow — returns API key on success
export async function authorizeWithOAuth(): Promise<string> {
  // A preference key short-circuits the whole OAuth flow.
  const preferenceKey = getPreferenceApiKey();
  if (preferenceKey) return preferenceKey;

  // If we already have a session token, reuse the stored key or regenerate one.
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    const existing = await LocalStorage.getItem<string>(API_KEY_KEY);
    if (existing) return existing;
    const keyResult = await generateApiKey(tokenSet.accessToken);
    await setApiKey(keyResult.apiKey);
    return keyResult.apiKey;
  }

  // Start PKCE flow
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${FRONT_BASE_URL}/oauth/authorize`,
    clientId: "macosicons-raycast",
    scope: "",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);

  // Exchange code for session token
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("client_id", "macosicons-raycast");

  const res = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) throw new Error(`OAuth token exchange failed (${res.status})`);

  const tokenResponse = (await res.json()) as OAuth.TokenResponse;
  if (
    !tokenResponse?.access_token ||
    typeof tokenResponse.access_token !== "string"
  ) {
    throw new Error("OAuth token response is missing access_token");
  }
  await oauthClient.setTokens(tokenResponse);

  // Generate API key from the session token (access_token = Parse session token)
  const keyResult = await generateApiKey(tokenResponse.access_token);
  await setApiKey(keyResult.apiKey);
  return keyResult.apiKey;
}

/**
 * Sign out — revokes the session on the backend, then clears the OAuth tokens
 * and API key.
 *
 * Local credentials are always cleared, because the user asked to sign out and
 * leaving them behind would strand the extension in a half-authenticated
 * state. But a failed revocation means the remote session is still valid (and
 * can still mint API keys), so it is rethrown for the caller to surface instead
 * of being reported as a clean sign-out.
 */
export async function signOut(): Promise<void> {
  const tokenSet = await oauthClient.getTokens();
  let revokeError: unknown;
  if (tokenSet?.accessToken) {
    try {
      await logout(tokenSet.accessToken);
    } catch (error) {
      revokeError = error;
    }
  }
  await oauthClient.removeTokens();
  await clearApiKey();

  if (revokeError) {
    const detail =
      revokeError instanceof Error ? revokeError.message : String(revokeError);
    throw new Error(
      `Could not revoke the session on macosicons.com: ${detail}. Sign out from the website to end it.`,
    );
  }
}

// Auth API
export async function logout(sessionToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/logOut`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-parse-session-token": sessionToken,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid session token");
    throw new Error(`Logout failed (${res.status})`);
  }
}

export interface GenerateApiKeyResponse {
  apiKey: string;
}

export async function generateApiKey(
  sessionToken: string,
): Promise<GenerateApiKeyResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/generateApiKey`, {
    method: "GET",
    headers: {
      "x-parse-session-token": sessionToken,
    },
  });

  if (!res.ok) {
    if (res.status === 401)
      throw new Error("Invalid session. Please log in again.");
    if (res.status === 400)
      throw new Error("Session token required. Please log in first.");
    throw new Error(`Failed to generate API key (${res.status})`);
  }

  return (await res.json()) as GenerateApiKeyResponse;
}

// Usage API
//
// NOTE: getUserData only returns the fields below. The backend does NOT return
// dailyUsage, plan, resetDate or subscriptionStatus for this endpoint, so we
// deliberately do not model them. apiCallLimit and totalUsage arrive as
// strings from Redis — use the normalized `ApiUsage` shape instead.
interface RawApiUsageResponse {
  currentMonthlyUsage: number | string;
  totalUsage: number | string;
  apiCallLimit: number | string;
  userStats?: unknown;
}

export interface ApiUsage {
  /** API calls made in the current calendar month. */
  currentMonthlyUsage: number;
  /** Total API calls made all-time. */
  totalUsage: number;
  /** Monthly call allowance for the current plan (free tier = 50). */
  apiCallLimit: number;
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getApiUsage(apiKey: string): Promise<ApiUsage> {
  const res = await fetch(`${BASE_URL}/api/v1/users/getUserData`, {
    method: "GET",
    headers: {
      "user-agent": "Raycast/1.0",
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    if (res.status === 400)
      throw new Error("Bad request: Missing user agent or API key");
    if (res.status === 401)
      throw new Error(
        "Invalid API key. Please sign in again or update your API key.",
      );
    if (res.status === 404) throw new Error("User not found");
    throw new Error(`Failed to get user data (${res.status})`);
  }

  const raw = (await res.json()) as RawApiUsageResponse;
  return {
    currentMonthlyUsage: toNumber(raw.currentMonthlyUsage),
    totalUsage: toNumber(raw.totalUsage),
    apiCallLimit: toNumber(raw.apiCallLimit),
  };
}

// Search API
export interface IconHit {
  appName: string;
  category: string;
  credit: string;
  downloads: number;
  iOSUrl: string;
  icnsUrl: string;
  lowResPngUrl: string;
  objectID: string;
  timeStamp: string;
  uploadedBy: string;
  usersName: string;
}

export interface SearchResponse {
  hits: IconHit[];
  hitsPerPage: number;
  page: number;
  totalHits: number;
  totalPages: number;
}

export async function searchIcons(
  query: string,
  options?: {
    page?: number;
    hitsPerPage?: number;
    apiKey?: string;
    signal?: AbortSignal;
  },
): Promise<SearchResponse> {
  // The search command already has the active key. Accepting it here avoids a
  // second LocalStorage/preferences read for every query and pagination call.
  const apiKey = options?.apiKey ?? (await getApiKey());
  if (!apiKey) {
    throw new Error(
      "API key required. Please sign in or set an API key in preferences.",
    );
  }

  // NOTE: the backend forces hitsPerPage to 50 for API-key callers, so the
  // requested value is effectively a hint. We keep it for forward-compat.
  const res = await fetch(`${BASE_URL}/api/v1/search`, {
    method: "POST",
    signal: options?.signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      searchOptions: {
        page: options?.page ?? 1,
        hitsPerPage: options?.hitsPerPage ?? 50,
        sort: ["timeStamp:desc"],
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 401)
      throw new Error(
        "Invalid API key. Please sign in again or update your API key.",
      );
    if (res.status === 429)
      throw new Error(
        "Rate limit reached. The free tier allows 2 requests/second and 50 requests/month.",
      );
    if (res.status === 400) throw new Error("Invalid search query");
    if (res.status === 403)
      throw new Error("Access denied. Please sign in or set a valid API key.");
    throw new Error(`Search failed (${res.status})`);
  }

  return (await res.json()) as SearchResponse;
}
