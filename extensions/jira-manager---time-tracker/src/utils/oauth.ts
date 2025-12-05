import { OAuth, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

const preferences = getPreferenceValues<Preferences>();

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Jira",
  providerIcon: "extension-icon.png",
  providerId: "jira",
  description: "Connect your Jira account",
});

export async function authorize() {
  if (!preferences.clientId) {
    throw new Error("Client ID is required for OAuth");
  }

  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokens = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokens);
      return newTokens.access_token;
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://auth.atlassian.com/authorize",
    clientId: preferences.clientId,
    scope: "read:jira-work write:jira-work read:jira-user offline_access",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: preferences.clientId,
      code: authorizationCode,
      redirect_uri: authRequest.redirectURI,
      code_verifier: authRequest.codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tokens");
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: preferences.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export async function getAccessToken(): Promise<string | undefined> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokens = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokens);
      return newTokens.access_token;
    }
    return tokenSet.accessToken;
  }
  return undefined;
}
