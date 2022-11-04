import { OAuth, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Board } from "@mirohq/miro-api";

// Miro App client ID
const clientId = "3458764537065046460";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Miro",
  providerIcon: "miro-logo.png",
  providerId: "miro",
  description: "Connect your Miro account.",
});

// Authorization
export async function authorize() {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://raycast-miro-pkce-proxy.up.railway.app/authorize",
    clientId: clientId,
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

// Fetch tokens
export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://raycast-miro-pkce-proxy.up.railway.app/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

// Refresh tokens
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://raycast-miro-pkce-proxy.up.railway.app/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// Fetch boards
export async function fetchItems(): Promise<Board[]> {
  const teamId = getPreferenceValues().team_id;

  if (!teamId) {
    throw new Error("Team ID not found");
  }

  const response = await fetch(`https://api.miro.com/v2/boards?team_id=${teamId}&sort=default`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as { data: Board[] };
  return json.data;
}

// Create board
export async function createItem(title: string, description: string): Promise<boolean> {
  const teamId = getPreferenceValues().team_id;

  if (!teamId) {
    throw new Error("Team ID not found");
  }

  const response = await fetch(`https://api.miro.com/v2/boards?team_id=${teamId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    body: JSON.stringify({
      name: title,
      description: description,
    }),
  });

  if (!response.ok) {
    console.error("create item error:", await response.text());
    throw new Error(response.statusText);
  }

  return true;
}
