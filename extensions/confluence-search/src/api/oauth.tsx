import { OAuth } from "@raycast/api";
import { Mutex } from "async-mutex";
import fetch from "cross-fetch";

const clientId = "gm689yESSpilBJjvwC2NigjkzcoVtXnc";
// NOTE: Changing these scopes will cause the app to re-request auth
export const scopes = [
  "read:confluence-content.all",
  "read:confluence-content.summary",
  "read:confluence-props",
  "read:confluence-space.summary",
  "read:confluence-user",
  "search:confluence",
];
const scopesString = Array.from(scopes).join(" ") + " offline_access";
const authMutex = new Mutex();
export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Confluence",
  providerIcon: "command-icon.png",
  description: "We need to connect your Atlassian account to access Confluence",
});

export async function refreshTokenIfRequired() {
  await authMutex.runExclusive(async () => {
    const tokenSet = await client.getTokens();

    if (tokenSet?.refreshToken && tokenSet?.isExpired()) {
      console.info("Token expired, refreshing!");
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
  });
}

// returns true if a new auth flow completed, false if not required
// never returns if the flow is cancelled
export async function authorize(forceReauth = false) {
  return await authMutex.runExclusive(async () => {
    const tokenSet = await client.getTokens();
    if (!forceReauth && tokenSet?.accessToken) {
      return false;
    }

    // kickoff UI OAuth flow
    const authRequest = await client.authorizationRequest({
      endpoint: "https://auth.atlassian.com/authorize",
      clientId: clientId,
      scope: scopesString,
      extraParameters: {
        audience: "api.atlassian.com",
        prompt: "consent",
      },
    });
    const { authorizationCode } = await client.authorize(authRequest);
    await client.setTokens(await fetchTokens(authRequest, authorizationCode));
    return true;
  });
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://auth.atlassian.com/oauth/token", { method: "POST", body: params });
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

  const response = await fetch("https://auth.atlassian.com/oauth/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
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
