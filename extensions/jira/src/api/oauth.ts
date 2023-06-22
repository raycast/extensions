import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "NAeIO0L9UVdGqKj5YF32HhcysfBCP31P";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Jira",
  providerIcon: "icon.png",
  providerId: "Jira",
  description: "Connect your Jira account",
});

export async function authorize() {
  const tokenSet = await oauthClient.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const tokens = await refreshTokens(tokenSet.refreshToken);
      await oauthClient.setTokens(tokens);
      return tokens.access_token;
    }

    return tokenSet.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://jira.oauth-proxy.raycast.com/authorize",
    clientId,
    scope: "read:jira-user read:jira-work write:jira-work offline_access read:sprint:jira-software",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://jira.oauth-proxy.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const tokens = await response.json();

  return tokens as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://jira.oauth-proxy.raycast.com/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;

  return tokenResponse;
}
