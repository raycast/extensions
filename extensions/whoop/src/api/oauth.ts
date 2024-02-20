import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "a4f97a37-75e8-4e64-b2e1-1235d3a1152a";
const scope = [
  "read:recovery",
  "read:cycles",
  "read:workout",
  "read:sleep",
  "read:profile",
  "read:body_measurement",
  "offline",
].join(" ");

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "WHOOP",
  providerIcon: "whoop-icon.svg",
  description: "Connect your WHOOP account",
  providerId: "whoop",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    if (existingTokens.refreshToken && existingTokens.isExpired()) {
      const tokens = await refreshTokens(existingTokens.refreshToken);
      await oauthClient.setTokens(tokens);
      return tokens.access_token;
    }
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://whoop.oauth.raycast.com/authorize",
    clientId,
    scope,
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://whoop.oauth.raycast.com/token", {
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
    const responseText = await response.text();
    throw new Error(`Error while fetching tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }

  const tokens = await response.json();

  return tokens as OAuth.TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://whoop.oauth.raycast.com/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Error while refreshing tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;

  return tokenResponse;
}
