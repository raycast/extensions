import { OAuth, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { XIcon } from "../../icon";

// Register a new OAuth app via https://developer.twitter.com/en/portal/dashboard
// Select OAuth 2.0
// As type of app choose: Native App
// For the redirect URL enter: https://raycast.com/redirect
// For the website URL enter: https://raycast.com

interface Preferences {
  clientid?: string;
}

export function getClientId(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.clientid || "";
}

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twitter",
  providerIcon: XIcon(),
  providerId: "twitter",
  description: "Connect your X account",
});

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await oauthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://twitter.com/i/oauth2/authorize",
    clientId: getClientId(),
    scope: "tweet.read tweet.write users.read follows.read like.read like.write offline.access",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  await oauthClient.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

export async function getOAuthTokens(): Promise<OAuth.TokenSet | undefined> {
  return await oauthClient.getTokens();
}

export async function resetOAuthTokens(): Promise<void> {
  await oauthClient.removeTokens();
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
