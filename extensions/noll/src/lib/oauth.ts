import { OAuth } from "@raycast/api";
import { NOLL_API_URL, WORKOS_AUTHORIZE_ENDPOINT, WORKOS_CLIENT_ID } from "./config";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Noll",
  providerIcon: "extension-icon.png",
  description: "Sign in to translate screenshots with Noll",
});

/**
 * Authorize with Noll via WorkOS OAuth.
 * This follows the Raycast OAuth guide pattern exactly.
 */
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();

  // If we have an access token, check if it needs refresh
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  // No token - full OAuth flow
  const authRequest = await client.authorizationRequest({
    endpoint: WORKOS_AUTHORIZE_ENDPOINT,
    clientId: WORKOS_CLIENT_ID,
    scope: "openid profile email offline_access",
    extraParameters: {
      provider: "authkit",
    },
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

/**
 * Get the access token, authorizing first if needed.
 * Always reads from Raycast's secure token storage.
 */
export async function getAccessToken(): Promise<string> {
  await authorize();
  const tokenSet = await client.getTokens();
  return tokenSet?.accessToken ?? "";
}

/**
 * Exchange authorization code for tokens via Noll API.
 */
async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(`${NOLL_API_URL}/api/ext/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: authCode,
      codeVerifier: authRequest.codeVerifier,
      redirectUri: authRequest.redirectURI,
    }),
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

/**
 * Refresh expired tokens via Noll API.
 */
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(`${NOLL_API_URL}/api/ext/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  // Preserve refresh token if not returned (some providers don't return it on refresh)
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

/**
 * Log out by removing stored tokens.
 */
export async function logout(): Promise<void> {
  await client.removeTokens();
}
