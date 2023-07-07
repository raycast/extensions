import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

const clientId = "7bbb789c01ff44ed842907b7a80c404f";
const scope = [
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-collaborative",
  "playlist-read-private",
  "user-follow-read",
  "user-library-modify",
  "user-library-read",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-private",
  "user-top-read",
].join(" ");

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Spotify",
  providerIcon: "spotify-icon.svg",
  description: "Connect your Spotify account",
  providerId: "spotify",
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
    endpoint: "https://accounts.spotify.com/authorize/",
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
  authCode: string
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const error: any = await response.json();
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
