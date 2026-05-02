import { LocalStorage, OAuth } from "@raycast/api";

// const FRONT_BASE_URL = "http://localhost:3010";
const FRONT_BASE_URL = "https://macosicons.com";
const BASE_URL = "https://api.macosicons.com";
// const BASE_URL = "http://localhost:3000";

const API_KEY_KEY = "api-key";

// OAuth PKCE client
export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "macOS Icons",
  providerIcon: "extension-logo.png",
  description: "Connect your macOS Icons account to search and apply icons.",
});

// API key management
export async function getApiKey(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(API_KEY_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await LocalStorage.setItem(API_KEY_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_KEY);
}

// OAuth authorization flow — returns API key on success
export async function authorizeWithOAuth(): Promise<string> {
  // If we already have a session token, just regenerate the API key
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    const existing = await getApiKey();
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

// Sign out — clears OAuth tokens, API key, and revokes session on backend
export async function signOut(): Promise<void> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    try {
      await logout(tokenSet.accessToken);
    } catch {
      // Ignore backend errors during sign-out
    }
  }
  await oauthClient.removeTokens();
  await clearApiKey();
}

// Ensures an API key is available, triggering OAuth if needed
export async function ensureApiKey(): Promise<string | undefined> {
  const existing = await getApiKey();
  if (existing) return existing;
  return await authorizeWithOAuth();
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
export interface ApiUsageResponse {
  dailyUsage: number;
  currentMonthlyUsage: number;
  plan: string;
  resetDate: string;
  subscriptionStatus: string;
  totalUsage: number;
  apiCallLimit: number;
  userStats?: object;
}

export async function getApiUsage(apiKey: string): Promise<ApiUsageResponse> {
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
    if (res.status === 404) throw new Error("User not found");
    throw new Error(`Failed to get user data (${res.status})`);
  }

  return (await res.json()) as ApiUsageResponse;
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
  options?: { page?: number; hitsPerPage?: number },
): Promise<SearchResponse> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      "API key required. Please log in or set an API key in preferences.",
    );
  }

  const res = await fetch(`${BASE_URL}/api/v1/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      searchOptions: {
        page: options?.page ?? 1,
        hitsPerPage: options?.hitsPerPage ?? 40,
        sort: ["timeStamp:desc"],
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 401)
      throw new Error(
        "Invalid API key. Please log in again or update your API key.",
      );
    if (res.status === 429)
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    if (res.status === 400) throw new Error("Invalid search query");
    throw new Error(`Search failed (${res.status})`);
  }

  return (await res.json()) as SearchResponse;
}
