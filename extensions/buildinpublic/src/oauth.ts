import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";

const development = getPreferenceValues<Preferences>().environment === "development";

export const SITE_URL = development ? "http://localhost:3000" : "https://buildinpublic.com";
export const API_URL = development ? "http://api.localhost:3000" : "https://api.buildinpublic.com";

const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";
const SCOPE = "read write";
const CLIENT_KEY = `oauth-client:${SITE_URL}`;
// Build in Public drops registered apps nobody authorized within a day.
const UNUSED_CLIENT_LIFETIME = 12 * 60 * 60 * 1000;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Build in Public",
  providerIcon: "extension-icon.png",
  providerId: development ? "buildinpublic-development" : "buildinpublic",
  description: "Connect your Build in Public account to manage your projects.",
});

// Search Deals fires two requests at once. A second one waits, then reads the
// tokens the first one stored, so they never register two clients or refresh
// the same token.
let turn: Promise<unknown> = Promise.resolve();

function inTurn<T>(run: () => Promise<T>): Promise<T> {
  const result = turn.then(run, run);
  turn = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

interface RegisteredClient {
  id: string;
  registeredAt: number;
  authorized: boolean;
}

export function accessToken(): Promise<string> {
  return inTurn(async () => {
    const tokens = await client.getTokens();

    if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;
    if (tokens?.refreshToken) {
      const refreshed = await refresh(tokens.refreshToken);
      if (refreshed) return refreshed;
    }

    return signIn();
  });
}

// For a request the server refused with 401 although the token looked fresh.
export function renewAccessToken(): Promise<string> {
  return inTurn(async () => {
    const tokens = await client.getTokens();
    const refreshed = tokens?.refreshToken ? await refresh(tokens.refreshToken) : undefined;
    return refreshed ?? signIn();
  });
}

async function signIn(): Promise<string> {
  await client.removeTokens();
  const registered = await registeredClient();

  const request = await client.authorizationRequest({
    endpoint: `${SITE_URL}/oauth/authorize`,
    clientId: registered.id,
    scope: SCOPE,
    extraParameters: { redirect_uri: REDIRECT_URI },
  });
  const { authorizationCode } = await client.authorize(request);

  const response = await tokenRequest({
    grant_type: "authorization_code",
    client_id: registered.id,
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: REDIRECT_URI,
  });
  if (!response.ok) throw new Error(`Couldn't sign in to Build in Public (${await oauthError(response)})`);

  const tokens = (await response.json()) as OAuth.TokenResponse;
  await client.setTokens(tokens);
  await LocalStorage.setItem(CLIENT_KEY, JSON.stringify({ ...registered, authorized: true }));
  return tokens.access_token;
}

async function refresh(refreshToken: string): Promise<string | undefined> {
  const registered = await storedClient();
  if (!registered) return undefined;

  const response = await tokenRequest({
    grant_type: "refresh_token",
    client_id: registered.id,
    refresh_token: refreshToken,
  });
  // The member disconnected the app, or the refresh token was already used.
  if (response.status === 400 || response.status === 401) return undefined;
  if (!response.ok) throw new Error(`Couldn't reach Build in Public (${await oauthError(response)})`);

  const tokens = (await response.json()) as OAuth.TokenResponse;
  await client.setTokens({ ...tokens, refresh_token: tokens.refresh_token ?? refreshToken });
  return tokens.access_token;
}

function tokenRequest(params: Record<string, string>) {
  return fetch(`${SITE_URL}/oauth/token`, { method: "POST", body: new URLSearchParams(params) });
}

// Build in Public has no fixed client id for Raycast: each install registers
// itself once (RFC 7591), like MCP clients do.
async function registeredClient(): Promise<RegisteredClient> {
  const stored = await storedClient();
  if (stored && (stored.authorized || Date.now() - stored.registeredAt < UNUSED_CLIENT_LIFETIME)) return stored;

  const response = await fetch(`${SITE_URL}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
    }),
  });
  if (!response.ok) throw new Error(`Couldn't connect to Build in Public (${await oauthError(response)})`);

  const { client_id } = (await response.json()) as { client_id: string };
  const registered = { id: client_id, registeredAt: Date.now(), authorized: false };
  await LocalStorage.setItem(CLIENT_KEY, JSON.stringify(registered));
  return registered;
}

async function storedClient(): Promise<RegisteredClient | undefined> {
  const stored = await LocalStorage.getItem<string>(CLIENT_KEY);
  return stored ? (JSON.parse(stored) as RegisteredClient) : undefined;
}

async function oauthError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error_description?: string; error?: string };
    return body.error_description ?? body.error ?? response.statusText;
  } catch {
    return response.statusText || String(response.status);
  }
}
