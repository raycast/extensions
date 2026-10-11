// One OAuth connection to Twelfth, and the rules for using it that the Raycast
// reviews taught us (ops/extensions/PLAYBOOK.md, "Signing in"):
//
//  1. Single-flight sign-in: parallel requests share one authorize() and one
//     reconnect, so a revoked connection opens one window, not several.
//  2. One refresh between concurrent readers: the server rotates refresh
//     tokens, so parallel refreshes would race each other.
//  3. Only a dead grant signs out. Timeouts, network errors and 5xx keep the
//     tokens.
//  4. Every connection change bumps an epoch, so a read that started under the
//     old connection never writes into the new one's cache.
//
// The host supplies storage and the interactive step (a browser redirect in
// Raycast, a dialog in Office); everything else is here.
import { type Endpoints, OAUTH_SCOPE } from "./config";
import {
  type ClientRegistration,
  TokenError,
  type TokenResponse,
  emailFromIdToken,
  subjectFromIdToken,
  registerClient,
  tokenRequest,
} from "./oauth";

export type StoredValue = string | number | boolean;

/** Raycast's LocalStorage, Office's OfficeRuntime.storage, or anything shaped like them. */
export type KeyValueStore = {
  getItem<T extends StoredValue>(key: string): Promise<T | undefined>;
  setItem(key: string, value: StoredValue): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type StoredTokens = { accessToken: string; refreshToken?: string; expired: boolean };

export type TokenStore = {
  get(): Promise<StoredTokens | undefined>;
  set(tokens: TokenResponse): Promise<void>;
  remove(): Promise<void>;
};

export type AuthorizeRequest = {
  /** Twelfth's authorize endpoint. The host adds PKCE, `state` and its redirect. */
  authorizeUrl: string;
  clientId: string;
  scope: string;
  /** Must be sent as `resource`, or the token is opaque and /mcp refuses it. */
  resource: string;
};

export type AuthorizationCode = { code: string; codeVerifier: string; redirectUri: string };

export type SessionOptions = {
  endpoints: Endpoints;
  client: ClientRegistration;
  storage: KeyValueStore;
  tokens: TokenStore;
  /** The interactive step: show Twelfth's sign-in and consent, return the code. */
  authorize(request: AuthorizeRequest): Promise<AuthorizationCode>;
  /** A workspace API key, when the host lets one be configured. It replaces OAuth entirely. */
  apiKey?: () => string | undefined;
};

export type Session = ReturnType<typeof createSession>;

export const CLIENT_ID_KEY = "oauth.clientId";
export const EMAIL_KEY = "oauth.email";
/** The signed-in person's Twelfth user id, from the ID token's `sub`. */
export const SUBJECT_KEY = "oauth.subject";
export const EPOCH_KEY = "oauth.epoch";
/** The cached workspace context (context.ts); belongs to one connection. */
export const CONTEXT_CACHE_KEY = "workspace.context";

export function createSession(options: SessionOptions) {
  const { endpoints, storage, tokens } = options;
  const apiKey = () => options.apiKey?.()?.trim() || undefined;

  async function clientId(): Promise<string> {
    if (options.client.staticClientId) return options.client.staticClientId;
    const stored = await storage.getItem<string>(CLIENT_ID_KEY);
    if (stored) return stored;
    const id = await registerClient(endpoints, options.client);
    await storage.setItem(CLIENT_ID_KEY, id);
    return id;
  }

  /**
   * Bumped whenever the OAuth connection changes (sign-in, sign-out, a dead
   * grant). Readers that started under an older connection must not write what
   * they read into a cache the new connection will use.
   */
  async function connectionEpoch(): Promise<number> {
    return (await storage.getItem<number>(EPOCH_KEY)) ?? 0;
  }

  async function bumpConnection() {
    await storage.setItem(EPOCH_KEY, (await connectionEpoch()) + 1);
    await storage.removeItem(CONTEXT_CACHE_KEY);
  }

  async function signedInEmail(): Promise<string | undefined> {
    if (apiKey()) return undefined;
    return storage.getItem<string>(EMAIL_KEY);
  }

  /** The signed-in person's Twelfth user id, when the ID token carried one. */
  async function signedInUserId(): Promise<string | undefined> {
    if (apiKey()) return undefined;
    return storage.getItem<string>(SUBJECT_KEY);
  }

  /** Keep who is signed in beside the tokens; nothing known clears what was there. */
  async function rememberPerson(email: string | undefined, userId: string | undefined, clear: boolean) {
    if (email) await storage.setItem(EMAIL_KEY, email);
    else if (clear) await storage.removeItem(EMAIL_KEY);
    if (userId) await storage.setItem(SUBJECT_KEY, userId);
    else if (clear) await storage.removeItem(SUBJECT_KEY);
  }

  async function refresh(refreshToken: string): Promise<string | undefined> {
    try {
      const refreshed = await tokenRequest(endpoints, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: await clientId(),
      });
      await tokens.set({ ...refreshed, refresh_token: refreshed.refresh_token ?? refreshToken });
      // A connection made before Core put the email in the ID token learns it here.
      await rememberPerson(emailFromIdToken(refreshed.id_token), subjectFromIdToken(refreshed.id_token), false);
      return refreshed.access_token;
    } catch (error) {
      // Only a dead grant (revoked in Settings → AI & agents, or rotated out)
      // means signing in again. A timeout or a 5xx keeps the tokens: the refresh
      // token is likely still good, and the next attempt will use it.
      if (!(error instanceof TokenError && error.dead)) throw error;
      await tokens.remove();
      await rememberPerson(undefined, undefined, true);
      await bumpConnection();
      return undefined;
    }
  }

  let reading: Promise<string | undefined> | undefined;
  let refreshing: Promise<string | undefined> | undefined;
  let forcing: Promise<string | undefined> | undefined;
  let authorizing: Promise<string> | undefined;
  let reconnecting: Promise<string> | undefined;

  async function readOrRefresh(force = false): Promise<string | undefined> {
    const stored = await tokens.get();
    if (!stored?.accessToken) return undefined;
    if (!force && !stored.expired) return stored.accessToken;
    if (!stored.refreshToken) return undefined;
    // Both callers must share the exchange. Twelfth rotates refresh tokens;
    // separate forced and expiry requests can revoke a working connection.
    refreshing ??= refresh(stored.refreshToken).finally(() => (refreshing = undefined));
    return refreshing;
  }

  /**
   * A usable token without any UI: the workspace key, a live access token, or a
   * refreshed one. Background callers use this so they never open a sign-in
   * window on their own.
   */
  function storedToken(): Promise<string | undefined> {
    const key = apiKey();
    if (key) return Promise.resolve(key);
    reading ??= readOrRefresh().finally(() => (reading = undefined));
    return reading;
  }

  /**
   * Refresh even though the stored token hasn't expired: the server refused it
   * (keys rotated, clock skew), and the refresh token may still be good.
   */
  function forceRefresh(): Promise<string | undefined> {
    if (apiKey()) return Promise.resolve(undefined);
    // Keep this separate from a read that may return the refused access token.
    // If the read actually refreshes, both paths share the exchange above.
    forcing ??= readOrRefresh(true).finally(() => (forcing = undefined));
    return forcing;
  }

  async function signIn(): Promise<string> {
    const existing = await storedToken();
    if (existing) return existing;

    const id = await clientId();
    try {
      const grant = await options.authorize({
        authorizeUrl: endpoints.authorize,
        clientId: id,
        scope: OAUTH_SCOPE,
        resource: endpoints.resource,
      });
      const issued = await tokenRequest(endpoints, {
        grant_type: "authorization_code",
        code: grant.code,
        code_verifier: grant.codeVerifier,
        redirect_uri: grant.redirectUri,
        client_id: id,
      });
      await tokens.set(issued);
      // The ID token when the server sends one; the access token's own claims
      // otherwise, which is all a resource-bound token may carry.
      const email = emailFromIdToken(issued.id_token) ?? emailFromIdToken(issued.access_token);
      const userId = subjectFromIdToken(issued.id_token) ?? subjectFromIdToken(issued.access_token);
      await rememberPerson(email, userId, true);
      // The new connection may be to another workspace.
      await bumpConnection();
      return issued.access_token;
    } catch (error) {
      // The registration was removed server-side: register afresh next time.
      if (error instanceof TokenError && error.code === "invalid_client") await storage.removeItem(CLIENT_ID_KEY);
      throw error;
    }
  }

  /**
   * A token, signing in interactively when there is none. Shared between
   * concurrent callers: a view reads several tools at once, and each must not
   * open its own sign-in window.
   */
  function authorize(): Promise<string> {
    authorizing ??= signIn().finally(() => (authorizing = undefined));
    return authorizing;
  }

  /** Forget the OAuth session so the next read signs in again. */
  async function signOut() {
    await tokens.remove();
    await rememberPerson(undefined, undefined, true);
    await bumpConnection();
  }

  /**
   * Twelfth ended the connection: forget it and sign in again, once, however
   * many requests found out at the same moment.
   */
  function reconnect(): Promise<string> {
    reconnecting ??= (async () => {
      await signOut();
      return authorize();
    })().finally(() => (reconnecting = undefined));
    return reconnecting;
  }

  /**
   * Take tokens the host obtained another way (the Excel add-in's silent
   * Microsoft 365 sign-in, which Core exchanges itself) as a new connection.
   */
  async function adopt(issued: TokenResponse, email?: string) {
    await tokens.set(issued);
    const known = email?.toLowerCase() ?? emailFromIdToken(issued.id_token) ?? emailFromIdToken(issued.access_token);
    const userId = subjectFromIdToken(issued.id_token) ?? subjectFromIdToken(issued.access_token);
    await rememberPerson(known, userId, true);
    await bumpConnection();
  }

  return {
    adopt,
    apiKey,
    authorize,
    connectionEpoch,
    forceRefresh,
    reconnect,
    signOut,
    signedInEmail,
    signedInUserId,
    storedToken,
  };
}
