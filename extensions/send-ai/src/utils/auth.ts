import { LocalStorage, OAuth } from "@raycast/api";
import { BackendAuthResponse } from "../type";
import { CacheAdapter } from "./cache";
import { URL_ENDPOINTS } from "../constants/endpoints";
import { STORAGE_KEYS } from "./constants";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "SendAI",
  providerIcon: "icon.png",
  providerId: "google",
  description: "Connect your Google account to SendAI\n(Wallet powered by Privy)",
});

const GOOGLE_CLIENT_ID = "12412930892-lglh33r17pqmobh28op3v9rv5nj9trbg.apps.googleusercontent.com";

export const provider = {
  client,
  authorize: async () => {
    // First, check if we have existing tokens
    const currentTokenSet = await client.getTokens();

    if (currentTokenSet?.accessToken) {
      // If we have a refresh token and the access token is expired, try to refresh
      if (currentTokenSet.refreshToken && currentTokenSet.isExpired()) {
        try {
          const tokens = await refreshTokens(currentTokenSet.refreshToken);
          await client.setTokens(tokens);
          // After refreshing Google tokens, fetch new backend token
          return await fetchBackendToken(tokens.id_token || "");
        } catch (error) {
          console.error("Failed to refresh tokens:", error);
          // If refresh fails, remove tokens and continue with new auth flow
          await client.removeTokens();
        }
      } else if (!currentTokenSet.isExpired()) {
        // Token is still valid, check if we have a cached backend token
        const existingBackendToken = await LocalStorage.getItem<string>(STORAGE_KEYS.BACKEND_SESSION_TOKEN);
        if (existingBackendToken) {
          return existingBackendToken;
        } else {
          // No backend token cached, fetch one using the valid Google token
          return await fetchBackendToken(currentTokenSet.idToken || "");
        }
      }
    }

    // No valid tokens, start new auth flow
    const authRequest = await client.authorizationRequest({
      endpoint: URL_ENDPOINTS.GOOGLE_AUTH_URL,
      clientId: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    });

    const { authorizationCode } = await client.authorize(authRequest);
    const tokens = await fetchTokens(authRequest, authorizationCode);
    await client.setTokens(tokens);
    return await fetchBackendToken(tokens.id_token || "");
  },
  refreshToken: async (refreshToken: string) => {
    const tokens = await refreshTokens(refreshToken);
    await client.setTokens(tokens);
    return await fetchBackendToken(tokens.id_token || "");
  },
  getTokens: async () => {
    const tokens = await client.getTokens();
    return tokens;
  },
  signOut: async () => {
    await client.removeTokens();
    await LocalStorage.removeItem(STORAGE_KEYS.BACKEND_SESSION_TOKEN);

    // Clear all cached data
    const cache = new CacheAdapter("temp"); // Create a temporary instance to access the cache
    cache.clear();
  },
};

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(URL_ENDPOINTS.GOOGLE_TOKEN_URL, { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("fetch tokens error:", responseText);
    throw new Error(`Error while fetching tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return tokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(URL_ENDPOINTS.GOOGLE_TOKEN_URL, { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("refresh tokens error:", responseText);
    // If refresh fails, throw error to trigger re-authorization
    throw new Error(`Error while refreshing tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function fetchBackendToken(googleIdToken: string): Promise<string> {
  const res = await fetch(URL_ENDPOINTS.BACKEND_CALLBACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${googleIdToken}`,
    },
  });
  const data = (await res.json()) as BackendAuthResponse;
  if (!data.token) {
    throw new Error("Error fetching SendAI token");
  }
  await LocalStorage.setItem(STORAGE_KEYS.BACKEND_SESSION_TOKEN, data.token);
  return data.token;
}
