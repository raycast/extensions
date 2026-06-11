import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { TRAKT_API_URL, TRAKT_APP_URL, TRAKT_CLIENT_ID, USER_AGENT } from "./constants";
const TOKEN_URL = `${TRAKT_API_URL}/oauth/token`;

const AuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Trakt",
  providerIcon: "trakt.png",
  description: "Connect your Trakt account…",
  providerId: "trakt",
});

async function fetchTokens({
  authRequest,
  authorizationCode,
}: {
  authRequest: OAuth.AuthorizationRequest;
  authorizationCode: string;
}): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", TRAKT_CLIENT_ID);
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: params,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("fetch tokens error:", responseText);
    throw new Error(`Error while fetching tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(token: string): Promise<OAuth.TokenResponse | undefined> {
  const params = new URLSearchParams();
  params.append("client_id", TRAKT_CLIENT_ID);
  params.append("refresh_token", token);
  params.append("grant_type", "refresh_token");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: params,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("refresh tokens error:", responseText);
    return undefined;
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? token;
  return tokenResponse;
}

export const AuthProvider = {
  async authorize(): Promise<string> {
    const currentTokenSet = await AuthClient.getTokens();

    if (currentTokenSet?.accessToken) {
      if (currentTokenSet.refreshToken && currentTokenSet.isExpired()) {
        const tokens = await refreshTokens(currentTokenSet.refreshToken);
        if (tokens) {
          await AuthClient.setTokens(tokens);
          return tokens.access_token;
        }
        // Refresh failed — clear tokens and re-authorize
        AuthClient.description = "Trakt needs you to sign-in again. Press ⏎ or click the button below to continue.";
        await AuthClient.removeTokens();
      } else {
        return currentTokenSet.accessToken;
      }
    }

    const authRequest = await AuthClient.authorizationRequest({
      endpoint: `${TRAKT_APP_URL}/oauth/authorize`,
      clientId: TRAKT_CLIENT_ID,
      scope: "",
    });
    const { authorizationCode } = await AuthClient.authorize(authRequest);
    const tokens = await fetchTokens({ authRequest, authorizationCode });
    await AuthClient.setTokens(tokens);
    return tokens.access_token;
  },
};
