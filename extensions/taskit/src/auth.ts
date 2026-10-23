import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { TaskitClient } from "./api";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  registerPublicClient,
  type OAuthTokenResponse,
} from "./taskit-oauth";

export const DEFAULT_API_BASE_URL =
  "https://func-taskit-dev-872f21.azurewebsites.net";

const CLIENT_ID_PREFIX = "taskit-oauth-client:";

interface Preferences {
  apiBaseUrl?: string;
}

export class NotSignedInError extends Error {
  constructor() {
    super("Sign in to Taskit");
    this.name = "NotSignedInError";
  }
}

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Taskit",
  providerIcon: "icon.png",
  providerId: "taskit",
  description: "Sign in with your Taskit account",
});

let accessToken: string | undefined;

export function readConfig(): { apiBaseUrl: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiBaseUrl: (prefs.apiBaseUrl?.trim() || DEFAULT_API_BASE_URL).replace(
      /\/$/,
      "",
    ),
  };
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

async function storeTokens(tokens: OAuthTokenResponse): Promise<void> {
  if (!tokens.refresh_token) {
    throw new Error("Taskit did not return a refresh token");
  }
  await oauthClient.setTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
  });
  accessToken = tokens.access_token;
}

async function refreshStored(refreshToken: string): Promise<void> {
  const issuer = readConfig().apiBaseUrl;
  const clientId = await LocalStorage.getItem<string>(clientKey(issuer));
  if (!clientId) throw new NotSignedInError();
  try {
    await storeTokens(
      await refreshAccessToken({ issuer, clientId, refreshToken }),
    );
  } catch (error) {
    await LocalStorage.removeItem(clientKey(issuer));
    await oauthClient.removeTokens();
    accessToken = undefined;
    throw error;
  }
}

export async function ensureAccessToken(): Promise<string> {
  const tokens = await oauthClient.getTokens();
  if (!tokens?.accessToken) throw new NotSignedInError();
  if (tokens.refreshToken && tokens.isExpired()) {
    await refreshStored(tokens.refreshToken);
  } else {
    accessToken = tokens.accessToken;
  }
  if (!accessToken) throw new NotSignedInError();
  return accessToken;
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
  const { apiBaseUrl } = readConfig();
  return new TaskitClient({
    baseUrl: apiBaseUrl,
    getToken: () => {
      if (!accessToken) throw new NotSignedInError();
      return accessToken;
    },
    refresh: async () => {
      const tokens = await oauthClient.getTokens();
      if (!tokens?.refreshToken) throw new NotSignedInError();
      await refreshStored(tokens.refreshToken);
    },
  });
}

export async function taskit(): Promise<TaskitClient> {
  await ensureAccessToken();
  return taskitClient();
}

export async function signIn(): Promise<void> {
  const issuer = readConfig().apiBaseUrl;
  const draft = await oauthClient.authorizationRequest({
    endpoint: `${issuer}/authorize`,
    clientId: "taskit",
    scope: "tasks",
  });
  const clientId = await clientIdFor(issuer, draft.redirectURI);
  const url = new URL(draft.toURL());
  url.searchParams.set("client_id", clientId);
  const { authorizationCode } = await oauthClient.authorize({
    url: url.toString(),
  });
  const tokens = await exchangeAuthorizationCode({
    issuer,
    clientId,
    code: authorizationCode,
    codeVerifier: draft.codeVerifier,
    redirectUri: draft.redirectURI,
  });
  await storeTokens(tokens);
}

export function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}
