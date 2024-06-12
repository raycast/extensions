import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { TRAKT_APP_URL, TRAKT_CLIENT_ID } from "./constants";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Trakt",
  providerIcon: "trakt.png",
  description: "Connect your Trakt account…",
  providerId: "trakt",
});

export const authorize = async () => {
  const existingTokens = await oauthClient.getTokens();
  if (existingTokens?.accessToken) {
    if (existingTokens?.refreshToken && existingTokens.isExpired()) {
      await refreshTokens(existingTokens.refreshToken);
      return;
    }
    return;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${TRAKT_APP_URL}/oauth/authorize`,
    clientId: TRAKT_CLIENT_ID,
    scope: "",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);

  const params = new URLSearchParams();
  params.append("client_id", TRAKT_CLIENT_ID);
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const tokenResponse = await fetch(`${TRAKT_APP_URL}/oauth/token`, {
    method: "POST",
    body: params,
  });

  if (!tokenResponse.ok) {
    throw new Error(tokenResponse.statusText);
  }

  const tokens = (await tokenResponse.json()) as OAuth.TokenResponse;
  await oauthClient.setTokens(tokens);
};

export const refreshTokens = async (refreshToken: string) => {
  const params = new URLSearchParams();
  params.append("client_id", TRAKT_CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(`${TRAKT_APP_URL}/oauth/token`, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  tokens.refresh_token = tokens.refresh_token ?? refreshToken;
  await oauthClient.setTokens(tokens);
};
