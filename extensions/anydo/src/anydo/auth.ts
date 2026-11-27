import { LocalStorage } from "@raycast/api";

import { AnyDoClient, type AuthSnapshot } from "./client";
import { refreshTokens, runLoginFlow, type OAuthTokens } from "./oauth";

const TOKENS_KEY = "anydo:tokens";
const CLIENT_KEY = "anydo:client";
const REFRESH_MARGIN_MS = 120_000;

export interface StoredClient {
  client_id: string;
  redirect_uri: string;
}

export class NotSignedInError extends Error {
  constructor() {
    super("You are not signed in to Any.do. Run the “Account” command first.");
    this.name = "NotSignedInError";
  }
}

export async function getStoredTokens(): Promise<OAuthTokens | null> {
  const raw = await LocalStorage.getItem<string>(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthTokens;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: OAuthTokens): Promise<void> {
  await LocalStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getStoredClient(): Promise<StoredClient | null> {
  const raw = await LocalStorage.getItem<string>(CLIENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredClient;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  await LocalStorage.removeItem(TOKENS_KEY);
  await LocalStorage.removeItem(CLIENT_KEY);
}

/** Runs the browser sign-in flow and stores the resulting tokens. */
export async function signIn(): Promise<void> {
  const { tokens, registration } = await runLoginFlow();
  await LocalStorage.setItem(
    CLIENT_KEY,
    JSON.stringify({
      client_id: registration.client_id,
      redirect_uri: registration.redirect_uri,
    }),
  );
  await saveTokens(tokens);
}

/** Returns usable credentials, refreshing them first when they are close to expiry. */
export async function getValidAuth(): Promise<AuthSnapshot> {
  const [tokens, client] = await Promise.all([
    getStoredTokens(),
    getStoredClient(),
  ]);
  if (!tokens) throw new NotSignedInError();

  const aboutToExpire = Boolean(
    tokens.expires_at && tokens.expires_at - REFRESH_MARGIN_MS < Date.now(),
  );
  if (client && tokens.refresh_token && aboutToExpire) {
    try {
      const refreshed = await refreshTokens(
        client.client_id,
        tokens.refresh_token,
      );
      const merged: OAuthTokens = {
        ...refreshed,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
      };
      await saveTokens(merged);
      return { clientId: client.client_id, tokens: merged };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("invalid_grant")) {
        await clearAuth();
        throw new NotSignedInError();
      }
      throw error;
    }
  }

  return { clientId: client?.client_id ?? "", tokens };
}

export function makeClient(): AnyDoClient {
  return new AnyDoClient({ getAuth: getValidAuth, saveTokens });
}
