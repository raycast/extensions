import { LocalStorage, OAuth } from "@raycast/api";

export type Workspace = { id: string; name: string; slug: string };
const CLIENT_ID = "alabasta-raycast";
const APP_URL = "https://beta.alabasta.io";
const API_URL = "https://fearless-warthog-265.eu-west-1.convex.site";
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Alabasta",
  providerId: "alabasta",
});

async function refresh(refreshToken: string) {
  const response = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) return undefined;
  return (await response.json()) as OAuth.TokenResponse;
}

export async function token() {
  let tokens = await client.getTokens();
  if (tokens?.isExpired() && tokens.refreshToken) {
    const renewed = await refresh(tokens.refreshToken);
    if (renewed) {
      await client.setTokens(renewed);
      tokens = await client.getTokens();
    }
  }
  if (!tokens || tokens.isExpired()) {
    const request = await client.authorizationRequest({
      endpoint: `${APP_URL}/oauth/authorize`,
      clientId: CLIENT_ID,
      scope: "alabasta.read alabasta.write",
    });
    const response = await client.authorize(request);
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: response.authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
    });
    const exchange = await fetch(`${API_URL}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!exchange.ok) throw new Error("Could not connect to Alabasta");
    await client.setTokens((await exchange.json()) as OAuth.TokenResponse);
    tokens = await client.getTokens();
  }
  if (!tokens) throw new Error("Could not connect to Alabasta");
  return tokens.accessToken;
}
export async function api<T>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/raycast/v1/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await token()}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Alabasta request failed");
  return payload;
}
export async function workspaceId() {
  const saved = await LocalStorage.getItem<string>("workspaceId");
  if (saved) return saved;
  const workspaces = await api<Workspace[]>("workspaces");
  if (workspaces.length === 1) {
    await LocalStorage.setItem("workspaceId", workspaces[0].id);
    return workspaces[0].id;
  }
  throw new Error("Choose a workspace from Search Alabasta first");
}
