import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { DEFAULT_ENDPOINT } from "./core";
import {
  Endpoints,
  OAuthError,
  SCOPES,
  discover,
  exchangeCode,
  refreshTokens,
  registerClient,
  resourceFor,
  revokeToken,
} from "./oauth-core";

export type AuthMode = "apikey" | "oauth";

interface Prefs {
  apiKey?: string;
  endpoint?: string;
  authMode?: AuthMode;
}

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "FirmLedger",
  providerIcon: "extension-icon.png",
  providerId: "firmledger",
  description:
    "Sign in to your FirmLedger account to use your listings, leads and Pro tools in Raycast. Your password never reaches Raycast.",
});

export function authMode(): AuthMode {
  // OAuth is the default; API key is used only when explicitly chosen.
  return getPreferenceValues<Prefs>().authMode === "apikey" ? "apikey" : "oauth";
}

export function configuredEndpoint(): string {
  const raw = getPreferenceValues<Prefs>().endpoint?.trim() || DEFAULT_ENDPOINT;
  // OAuth tokens are resource-bound: never send them to a key-in-path URL.
  return authMode() === "oauth" ? resourceFor(raw) : raw;
}

const CLIENT_KEY = "firmledger.oauth.client";
let inflight: Promise<string> | undefined;

async function endpoints(): Promise<Endpoints> {
  return discover(configuredEndpoint());
}

async function ensureClientId(ep: Endpoints, scope: string): Promise<{ clientId: string; redirectUri: string }> {
  // A throw-away request only to learn Raycast's redirect URI (no network involved).
  const probe = await client.authorizationRequest({ endpoint: ep.authorization, clientId: "probe", scope });
  const redirectUri = probe.redirectURI;
  const cached = await LocalStorage.getItem<string>(CLIENT_KEY);
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (c.redirectUri === redirectUri && c.registration === ep.registration) return { clientId: c.clientId, redirectUri };
    } catch {
      /* re-register */
    }
  }
  const clientId = await registerClient(ep, redirectUri);
  await LocalStorage.setItem(CLIENT_KEY, JSON.stringify({ clientId, redirectUri, registration: ep.registration }));
  return { clientId, redirectUri };
}

async function store(r: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }, prev?: string) {
  await client.setTokens({ accessToken: r.access_token, refreshToken: r.refresh_token ?? prev, expiresIn: r.expires_in, scope: r.scope });
}

export async function signIn(): Promise<string> {
  const ep = await endpoints();
  const resource = resourceFor(configuredEndpoint());
  const { clientId, redirectUri } = await ensureClientId(ep, SCOPES);
  const request = await client.authorizationRequest({ endpoint: ep.authorization, clientId, scope: SCOPES, extraParameters: { resource } });
  const { authorizationCode } = await client.authorize(request);
  const tokens = await exchangeCode(ep, {
    clientId,
    code: authorizationCode,
    verifier: request.codeVerifier,
    redirectUri: request.redirectURI ?? redirectUri,
    resource,
  });
  await store(tokens);
  return tokens.access_token;
}

async function oauthToken(force: boolean): Promise<string> {
  const tokens = await client.getTokens();
  if (tokens?.accessToken && !force && !tokens.isExpired()) return tokens.accessToken;
  if (tokens?.refreshToken) {
    try {
      const ep = await endpoints();
      const cached = await LocalStorage.getItem<string>(CLIENT_KEY);
      const clientId = cached ? JSON.parse(cached).clientId : undefined;
      if (clientId) {
        const r = await refreshTokens(ep, { clientId, refreshToken: tokens.refreshToken, resource: resourceFor(configuredEndpoint()) });
        await store(r, tokens.refreshToken);
        return r.access_token;
      }
    } catch (e) {
      if (!(e instanceof OAuthError) || e.code === "network_error") throw e;
      // invalid_grant etc.: the connection ended; fall through to a fresh sign-in.
    }
    await client.removeTokens();
  }
  return signIn();
}

/** Bearer credential for the configured mode (API key, or a valid OAuth access token). */
export async function getBearer(force = false): Promise<string | undefined> {
  if (authMode() === "apikey") return getPreferenceValues<Prefs>().apiKey?.trim() || undefined;
  if (!inflight) inflight = oauthToken(force).finally(() => (inflight = undefined));
  return inflight;
}

export async function signOut(): Promise<void> {
  const tokens = await client.getTokens();
  const cached = await LocalStorage.getItem<string>(CLIENT_KEY);
  const clientId = cached ? JSON.parse(cached).clientId : undefined;
  const t = tokens?.refreshToken ?? tokens?.accessToken;
  if (t) await revokeToken(await endpoints(), t, clientId);
  await client.removeTokens();
}

export async function oauthStatus(): Promise<{ signedIn: boolean; expiresSoon?: boolean; scope?: string }> {
  const t = await client.getTokens();
  if (!t?.accessToken) return { signedIn: false };
  return { signedIn: true, expiresSoon: t.isExpired(), scope: t.scope };
}
