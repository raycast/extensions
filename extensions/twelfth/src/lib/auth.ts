import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { OAUTH } from "./config";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twelfth",
  providerIcon: "icon.png",
  providerId: "twelfth",
  description: "Connect Raycast to your Twelfth workspace. You'll choose the workspace on the next page.",
});

const CLIENT_ID_KEY = "oauth.clientId";
const EMAIL_KEY = "oauth.email";

export class NotSignedInError extends Error {
  constructor(message = "Not connected to Twelfth") {
    super(message);
  }
}

export function apiKey(): string | undefined {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey?.trim() || undefined;
}

/**
 * The OAuth client id for this install. The server allows open dynamic client
 * registration, so each install registers itself once (as every MCP client
 * does) and keeps the id. No secret: Raycast is a public PKCE client.
 */
async function clientId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (stored) return stored;
  const response = await fetch(OAUTH.register, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      client_uri: "https://www.raycast.com",
      redirect_uris: [OAUTH.redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: OAUTH.scope,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { client_id?: string; error_description?: string };
  if (!response.ok || !body.client_id) {
    throw new Error(body.error_description ?? `Couldn't register with Twelfth (${response.status})`);
  }
  await LocalStorage.setItem(CLIENT_ID_KEY, body.client_id);
  return body.client_id;
}

type TokenResponse = OAuth.TokenResponse & { id_token?: string; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(OAUTH.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, resource: OAUTH.resource }),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    const error = new Error(body.error_description ?? body.error ?? `Twelfth sign-in failed (${response.status})`);
    (error as Error & { code?: string }).code = body.error;
    throw error;
  }
  return body;
}

/** The signed-in person's email, from the ID token, so "mine" can be told apart. */
async function rememberEmail(idToken: string | undefined) {
  if (!idToken) return;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    if (payload.email) await LocalStorage.setItem(EMAIL_KEY, payload.email.toLowerCase());
  } catch {
    // An unreadable ID token only costs the "mine" filter.
  }
}

export async function signedInEmail(): Promise<string | undefined> {
  if (apiKey()) return undefined;
  return LocalStorage.getItem<string>(EMAIL_KEY);
}

/**
 * A usable token without any UI: the workspace key, a live access token, or a
 * refreshed one. Background commands (the menu bar, AI tools) use this so they
 * never pop an OAuth window on their own.
 */
export async function storedToken(): Promise<string | undefined> {
  const key = apiKey();
  if (key) return key;
  // Commands read several tools at once. One refresh between them: the server
  // rotates refresh tokens, so parallel refreshes would race each other.
  refreshing ??= readOrRefresh().finally(() => (refreshing = undefined));
  return refreshing;
}

let refreshing: Promise<string | undefined> | undefined;

async function readOrRefresh(): Promise<string | undefined> {
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) return undefined;
  if (!tokens.isExpired()) return tokens.accessToken;
  if (!tokens.refreshToken) return undefined;
  try {
    const refreshed = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: await clientId(),
    });
    await client.setTokens({ ...refreshed, refresh_token: refreshed.refresh_token ?? tokens.refreshToken });
    return refreshed.access_token;
  } catch {
    // A refresh token that no longer works (revoked in Settings → AI & agents,
    // or rotated out) means signing in again.
    await client.removeTokens();
    return undefined;
  }
}

/** A token, signing in through the browser when there is none. */
export async function authorize(): Promise<string> {
  const existing = await storedToken();
  if (existing) return existing;

  const id = await clientId();
  const request = await client.authorizationRequest({
    endpoint: OAUTH.authorize,
    clientId: id,
    scope: OAUTH.scope,
    extraParameters: { resource: OAUTH.resource },
  });
  const { authorizationCode } = await client.authorize(request);
  try {
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
      client_id: id,
    });
    await client.setTokens(tokens);
    await rememberEmail(tokens.id_token);
    return tokens.access_token;
  } catch (error) {
    // The registration was removed server-side: register afresh next time.
    if ((error as { code?: string }).code === "invalid_client") await LocalStorage.removeItem(CLIENT_ID_KEY);
    throw error;
  }
}

/** Forget the OAuth session so the next command signs in again. */
export async function signOut() {
  await client.removeTokens();
  await LocalStorage.removeItem(EMAIL_KEY);
}
