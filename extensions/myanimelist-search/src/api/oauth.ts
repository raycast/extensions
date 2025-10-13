import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

import { generateCodeVerifier } from "./challenge";

export const clientId = "7ec0f5fdf1df7156754eea431e83acf6";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "My Anime List",
  providerIcon: "MAL_macOS@0.1x.png",
  providerId: "mal",
  description: "Connect your My Anime List account",
});

// Authorization
export async function getTokens(): Promise<OAuth.TokenSet | undefined> {
  return client.getTokens();
}

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const codeChallenge = generateCodeVerifier();
  const authRequest = await client.authorizationRequest({
    endpoint: "https://myanimelist.net/v1/oauth2/authorize",
    clientId: clientId,
    scope: "write:users",
    extraParameters: { code_challenge: codeChallenge, code_challenge_method: "plain" },
  });
  authRequest.codeChallenge = codeChallenge;
  authRequest.codeVerifier = codeChallenge;
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function isSignedIn(): Promise<boolean> {
  const tokens = await getTokens();
  return tokens?.accessToken !== undefined && !tokens.isExpired();
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://myanimelist.net/v1/oauth2/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://myanimelist.net/v1/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
