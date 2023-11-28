import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "a4f97a37-75e8-4e64-b2e1-1235d3a1152a";
const whoopRedirectUri = "https://raycast.com/redirect/extension";
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
  console.log("🔑 Authorizing...");
  const existingTokens = await oauthClient.getTokens();
  console.log("🍬 Tokens:", existingTokens);

  if (existingTokens?.accessToken) {
    if (existingTokens.refreshToken && existingTokens.isExpired()) {
      const tokens = await refreshTokens(existingTokens.refreshToken);
      await oauthClient.setTokens(tokens);
      return tokens.access_token;
    }
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
    clientId: clientId,
    scope: scope,
    extraParameters: { redirect_uri: whoopRedirectUri },
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
  const response = await fetch("https://www.joshallen.fyi/api/exchangeToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: authCode,
      codeVerifier: authRequest.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Error response:", errorBody);
    throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://www.joshallen.fyi/api/refreshToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    if (error.error === "invalid_grant") {
      oauthClient.removeTokens();
      authorize();
    }
    throw new Error(response.statusText);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  tokens.refresh_token = tokens.refresh_token ?? refreshToken;

  return tokens;
}
