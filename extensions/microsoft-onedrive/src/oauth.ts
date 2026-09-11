import { OAuth } from "@raycast/api";

const CLIENT_ID = "5d599290-117f-4b34-bc3f-914fb6879961";
const REDIRECT_URI = "https://raycast.com/redirect/extension";
const AUTHORIZATION_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const SCOPES = ["User.Read", "Files.ReadWrite.All", "Sites.Read.All", "offline_access"];

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Microsoft",
  providerIcon: "extension-icon.png",
  providerId: "microsoft",
  description: "Connect your Microsoft account to access OneDrive and SharePoint files…",
});

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Authorize with Microsoft and get tokens
 */
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      try {
        await refreshTokens(tokenSet.refreshToken);
        return;
      } catch (error) {
        console.error("Token refresh failed:", error);
        // If refresh fails, continue to re-authorize
      }
    } else {
      return;
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZATION_ENDPOINT,
    clientId: CLIENT_ID,
    scope: SCOPES.join(" "),
    extraParameters: {
      redirect_uri: REDIRECT_URI,
    },
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await fetchTokens(authRequest, authorizationCode);
}

/**
 * Fetch tokens from Microsoft
 */
async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<void> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", REDIRECT_URI);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token fetch error:", errorText);
    throw new Error(`Failed to fetch tokens: ${response.statusText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  await client.setTokens(tokenResponse);
}

/**
 * Refresh expired access token
 */
async function refreshTokens(refreshToken: string): Promise<void> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");
  params.append("scope", SCOPES.join(" "));

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh error:", errorText);
    throw new Error(`Failed to refresh tokens: ${response.statusText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  // Preserve the refresh token if not included in response
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  await client.setTokens(tokenResponse);
}

/**
 * Get the current access token
 */
export async function getAccessToken(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (!tokenSet?.accessToken) {
    throw new Error("No access token available. Please authorize first.");
  }

  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    await refreshTokens(tokenSet.refreshToken);
    const newTokenSet = await client.getTokens();
    if (!newTokenSet?.accessToken) {
      throw new Error("Failed to refresh access token");
    }
    return newTokenSet.accessToken;
  }

  return tokenSet.accessToken;
}

/**
 * Logout and clear tokens
 */
export async function logout(): Promise<void> {
  await client.removeTokens();
}
