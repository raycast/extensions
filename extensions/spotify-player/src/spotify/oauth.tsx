import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

const clientId = "7bbb789c01ff44ed842907b7a80c404f";
const scope = "user-library-modify user-modify-playback-state";
//
// user-read-currently-playing
const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Spotify",
  providerIcon: "icon.png",
  description: "Connect your Spotify account",
});

// Authorization

export async function isAuthorized(): Promise<boolean> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet?.accessToken.length > 0;
  }
  return false;
}

export async function authorize(): Promise<string> {
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
    endpoint: "https://accounts.spotify.com/authorize/",
    clientId: clientId,
    scope: scope,
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", body: params });
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
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function logout() {
  await oauthClient.removeTokens();
}
