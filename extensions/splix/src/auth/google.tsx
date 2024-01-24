import { OAuth, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { env } from "../env";
import { supabase } from "../supabase";

// Create an OAuth client ID via https://console.developers.google.com/apis/credentials
// As application type choose "iOS" (required for PKCE)
// As Bundle ID enter: com.raycast
const clientId = env.GOOGLE_CLIENT_ID;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account",
});

export async function signOut() {
  await client.removeTokens();
  await supabase.auth.signOut();
  popToRoot();
}

export async function authorize() {
  // Check if there are existing tokens and if they are valid
  let tokenSet = await client.getTokens();
  if (tokenSet && tokenSet.accessToken && !tokenSet.isExpired()) {
    await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokenSet.idToken as string,
      nonce: "NONCE",
    });
    return;
  } else if (tokenSet && tokenSet.refreshToken) {
    await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    tokenSet = await client.getTokens();
    await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokenSet?.idToken as string,
      nonce: "NONCE",
    });
    return;
  }

  // code 399cbad7-e68d-406f-b220-d7921ab63243
  // Start a new authorization request if no valid tokens are found
  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));

  tokenSet = await client.getTokens();

  // Assuming supabase is defined and configured correctly
  await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokenSet!.idToken as string,
    nonce: "NONCE",
  });
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
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
