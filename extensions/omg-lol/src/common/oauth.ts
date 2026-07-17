import fetch from "node-fetch";
import { OAuth } from "@raycast/api";
import { GET } from "./api";
import { Account } from "./types";
import { setAccountFromResponse } from "./account";

const clientId = "5d01ff82a327f8edb8fb5c7839069300";
const tokenURL = "https://raycast-pkce-proxy-omg-lol.fly.dev/token";
const authorizeURL = "https://raycast-pkce-proxy-omg-lol.fly.dev/authorize";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "omg.lol",
  providerIcon: "omg.lol-logo.png",
  description: "Connect your omg.lol account…",
});

export async function getTokens(): Promise<OAuth.TokenSet> {
  await authorize();
  const tokenSet = await client.getTokens();
  if (!tokenSet) {
    throw new Error("Invalid state");
  }
  return tokenSet;
}

async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
      await updateAccountName();
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: authorizeURL,
    clientId: clientId,
    scope: "everything",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
  await updateAccountName();
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(tokenURL, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
      scope: "everything",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(tokenURL, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "everything",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function updateAccountName(): Promise<void> {
  const accounts = (await GET("account/list/addresses", true)) as Account[];
  await setAccountFromResponse(accounts);
}
