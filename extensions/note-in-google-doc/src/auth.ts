import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "277994667370-o9tch6gd0i81jkqafo3qn4cb3drrccs5.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account",
});

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    // if token is expired, regenerate it using refreshToken
    if (tokenSet.isExpired() && tokenSet.refreshToken) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope: SCOPES,
  });

  const { authorizationCode } = await client.authorize(authRequest);

  // check if the token scopes matches the required scope for the app
  const tokenData = await fetchTokens(authRequest, authorizationCode);
  if (tokenData?.scope !== SCOPES) {
    await client.removeTokens();
    throw new Error("Scope mismatch, Retry the authentication!");
  }

  await client.setTokens(tokenData);
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
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

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("error status:  ", await response.status, " refresh tokens error:", await response.statusText);
    if (response.status > 400) {
      // worst case if a refresh token can't be obtained, enable the user to go through the login flow again
      await client.removeTokens();
    }
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function checkTokenValidity() {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    // if token is expired, regenerate it using refreshToken
    if (tokenSet.isExpired() && tokenSet.refreshToken) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
  }
  return true;
}
