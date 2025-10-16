import fetch from "node-fetch";
import { OAuth, getPreferenceValues } from "@raycast/api";
import MonzoClient from "@marceloclp/monzojs";
import { IMonzoClient } from "@marceloclp/monzojs/lib/types/client";

const authorizeUrl = "https://monzo.oauth-proxy.raycast.com/authorize";
const tokenUrl = "https://monzo.oauth-proxy.raycast.com/token";
const monzoRefreshTokenUri = "https://api.monzo.com/oauth2/token";
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Monzo",
  providerId: "monzo",
  providerIcon: "monzo_transparent.png",
  description: "Connect your Monzo account...",
});

interface Preferences {
  oauthClientId: string;
  oauthClientSecret: string;
}

export async function getClient(): Promise<IMonzoClient> {
  const tokenSet = await client.getTokens();

  // If no access token, auth and try again.
  if (!tokenSet || !tokenSet.accessToken) {
    await initAuth();
    return getClient();
  }

  // If needs refresh, refresh and try again
  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    await client.setTokens(await refreshTokens(tokenSet?.refreshToken));
    return getClient();
  }

  // If no refresh token, something has gone wrong
  if (!tokenSet.refreshToken) {
    throw new Error("No refresh token");
  }

  return MonzoClient(tokenSet.accessToken);
}

async function initAuth() {
  const preferences = getPreferenceValues<Preferences>();
  const authRequest = await client.authorizationRequest({
    endpoint: authorizeUrl,
    clientId: preferences.oauthClientId.trim(),
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string
): Promise<OAuth.TokenResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: preferences.oauthClientId.trim(),
      client_secret: preferences.oauthClientSecret.trim(),
      code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });

  if (!response.ok) {
    console.error("Error completing sign-in:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  refreshToken: string
): Promise<OAuth.TokenResponse> {
  const preferences = getPreferenceValues<Preferences>();

  const data = new URLSearchParams();
  data.append("client_id", preferences.oauthClientId.trim());
  data.append("refresh_token", refreshToken);
  data.append("grant_type", "refresh_token");
  data.append("client_secret", preferences.oauthClientSecret.trim());
  const response = await fetch(monzoRefreshTokenUri, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    console.error("Error refreshing access:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return tokenResponse;
}
