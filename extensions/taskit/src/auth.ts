import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { TaskitClient } from "./api";
import {
  exchangeAuthorizationCode,
  providerIdFor,
  refreshAccessToken,
  registerPublicClient,
  sessionRejected,
  type OAuthTokenResponse,
} from "./taskit-oauth";

export const DEFAULT_API_BASE_URL =
  "https://func-taskit-dev-872f21.azurewebsites.net";

const CLIENT_ID_PREFIX = "taskit-oauth-client:";

export class NotSignedInError extends Error {
  constructor() {
    super("Sign in to Taskit");
    this.name = "NotSignedInError";
  }
}

const clients = new Map<string, OAuth.PKCEClient>();
const accessTokens = new Map<string, string>();

function clientFor(issuer: string): OAuth.PKCEClient {
  const providerId = providerIdFor(issuer);
  const cached = clients.get(providerId);
  if (cached) return cached;
  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Taskit",
    providerIcon: "icon.png",
    providerId,
    description: "Sign in with your Taskit account",
  });
  clients.set(providerId, client);
  return client;
}

export function readConfig(): { apiBaseUrl: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiBaseUrl: (prefs.apiBaseUrl.trim() || DEFAULT_API_BASE_URL).replace(
      /\/$/,
      "",
    ),
  };
}

/** The hosted API has a known web app. A custom API address does not. */
export function usesHostedApi(): boolean {
  return readConfig().apiBaseUrl === DEFAULT_API_BASE_URL;
}

function clientKey(issuer: string): string {
  return `${CLIENT_ID_PREFIX}${issuer}`;
}

async function clientIdFor(
  issuer: string,
  redirectUri: string,
): Promise<string> {
  const stored = await LocalStorage.getItem<string>(clientKey(issuer));
  if (stored) return stored;
  const client = await registerPublicClient(issuer, redirectUri);
  await LocalStorage.setItem(clientKey(issuer), client.client_id);
  return client.client_id;
}

async function clearSession(issuer: string): Promise<void> {
  await LocalStorage.removeItem(clientKey(issuer));
  await clientFor(issuer).removeTokens();
  accessTokens.delete(issuer);
}

async function storeTokens(
  issuer: string,
  tokens: OAuthTokenResponse,
): Promise<void> {
  if (!tokens.refresh_token) {
    throw new Error("Taskit did not return a refresh token");
  }
  await clientFor(issuer).setTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
  });
  accessTokens.set(issuer, tokens.access_token);
}

async function refreshStored(
  issuer: string,
  refreshToken: string,
): Promise<void> {
  const clientId = await LocalStorage.getItem<string>(clientKey(issuer));
  if (!clientId) throw new NotSignedInError();
  try {
    await storeTokens(
      issuer,
      await refreshAccessToken({ issuer, clientId, refreshToken }),
    );
  } catch (error) {
    if (sessionRejected(error)) await clearSession(issuer);
    throw error;
  }
}

export async function ensureAccessToken(): Promise<string> {
  const issuer = readConfig().apiBaseUrl;
  const tokens = await clientFor(issuer).getTokens();
  if (!tokens?.accessToken) throw new NotSignedInError();
  if (tokens.refreshToken && tokens.isExpired()) {
    await refreshStored(issuer, tokens.refreshToken);
  } else {
    accessTokens.set(issuer, tokens.accessToken);
  }
  const token = accessTokens.get(issuer);
  if (!token) throw new NotSignedInError();
  return token;
}

export async function probeSession(): Promise<boolean> {
  try {
    await ensureAccessToken();
    return true;
  } catch (error) {
    if (error instanceof NotSignedInError) return false;
    throw error;
  }
}

export function taskitClient(): TaskitClient {
  const issuer = readConfig().apiBaseUrl;
  return new TaskitClient({
    baseUrl: issuer,
    getToken: () => {
      const token = accessTokens.get(issuer);
      if (!token) throw new NotSignedInError();
      return token;
    },
    refresh: async () => {
      const tokens = await clientFor(issuer).getTokens();
      if (!tokens?.refreshToken) throw new NotSignedInError();
      await refreshStored(issuer, tokens.refreshToken);
    },
  });
}

export async function taskit(): Promise<TaskitClient> {
  await ensureAccessToken();
  return taskitClient();
}

export async function signIn(): Promise<void> {
  const issuer = readConfig().apiBaseUrl;
  const client = clientFor(issuer);
  const draft = await client.authorizationRequest({
    endpoint: `${issuer}/authorize`,
    clientId: "taskit",
    scope: "tasks",
  });
  const clientId = await clientIdFor(issuer, draft.redirectURI);
  const url = new URL(draft.toURL());
  url.searchParams.set("client_id", clientId);
  const { authorizationCode } = await client.authorize({ url: url.toString() });
  const tokens = await exchangeAuthorizationCode({
    issuer,
    clientId,
    code: authorizationCode,
    codeVerifier: draft.codeVerifier,
    redirectUri: draft.redirectURI,
  });
  await storeTokens(issuer, tokens);
}

export function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}
