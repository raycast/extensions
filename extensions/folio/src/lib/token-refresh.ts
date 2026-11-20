/**
 * Access-token lifecycle: when to refresh, and how to survive two processes refreshing at once.
 * Pure (no Raycast imports) so the race can be unit tested; auth.ts wires it to OAuth.PKCEClient.
 *
 * SnapTrade refresh tokens are single-use: every refresh returns a new pair and revokes the old
 * refresh token immediately, with no grace period. Raycast runs each command in its own process
 * (the Menu Bar in the background every 15 minutes, plus whatever the user opens), and they all share
 * one token store. When the access token expires, two processes can refresh with the same refresh
 * token; one wins and the other gets invalid_grant. That loser is not signed out: the winner has
 * already stored a fresh pair, so the loser re-reads the store and uses it.
 */
import { AuthError } from "./auth-error";

/** What the token store holds (the subset of Raycast's OAuth.TokenSet this module reads). */
export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  /** Lifetime in seconds, counted from `updatedAt`. */
  expiresIn?: number;
  updatedAt: Date;
}

/** What the auth worker returns from /oauth/refresh (an OAuth token response). */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  token_type?: string;
}

export interface TokenStore {
  get(): Promise<StoredTokens | undefined>;
  set(tokens: TokenResponse): Promise<void>;
  remove(): Promise<void>;
}

export interface TokenManagerDeps {
  store: TokenStore;
  /** Exchanges a refresh token for a new pair. Must throw AuthError("refresh-failed") on invalid_grant. */
  exchange(refreshToken: string): Promise<TokenResponse>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /**
   * After invalid_grant, how long to wait between re-reads of the store before concluding the
   * refresh token is really dead. Covers the moment where the winning process has its new pair but
   * hasn't written it yet.
   */
  settleDelaysMs?: number[];
  /** How long a request waits for an early refresh before going ahead with the current token. */
  earlyRefreshWaitMs?: number;
}

/** Refresh this long before the real expiry so requests don't straddle it. */
export const EXPIRY_MARGIN_MS = 5 * 60_000;
const DEFAULT_SETTLE_DELAYS_MS = [250, 750, 1500];
const DEFAULT_EARLY_REFRESH_WAIT_MS = 10_000;

/**
 * True when the access token expires within `marginMs`. The margin is capped at half the token's
 * lifetime so a short-lived token isn't treated as permanently expired. Unknown lifetime: never.
 */
export function expiresSoon(tokens: StoredTokens, now: number, marginMs = EXPIRY_MARGIN_MS): boolean {
  if (!tokens.expiresIn) return false;
  const lifetimeMs = tokens.expiresIn * 1000;
  const expiresAt = tokens.updatedAt.getTime() + lifetimeMs;
  return now >= expiresAt - Math.min(marginMs, lifetimeMs / 2);
}

export interface GetAccessTokenOptions {
  /** Refresh even if the token looks valid (after a 401). */
  force?: boolean;
  /** The access token SnapTrade just rejected. If the store already holds a different one, use that instead of refreshing again. */
  rejected?: string;
}

export function createTokenManager(deps: TokenManagerDeps) {
  const { store, exchange } = deps;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const settleDelays = deps.settleDelaysMs ?? DEFAULT_SETTLE_DELAYS_MS;
  const earlyWait = deps.earlyRefreshWaitMs ?? DEFAULT_EARLY_REFRESH_WAIT_MS;

  let inFlight: Promise<string> | null = null;
  /** The last rotation this process completed, so a caller holding the old refresh token doesn't spend it again. */
  let lastRotation: { from: string; accessToken: string } | null = null;

  /** Re-reads the store until it no longer holds `failed`, or the settle delays run out. */
  async function settle(failed: string): Promise<StoredTokens | undefined> {
    let current = await store.get();
    for (const ms of settleDelays) {
      if (current?.refreshToken !== failed) return current;
      await sleep(ms);
      current = await store.get();
    }
    return current;
  }

  async function rotate(refreshToken: string): Promise<string> {
    try {
      const tokens = await exchange(refreshToken);
      if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
      await store.set(tokens);
      lastRotation = { from: refreshToken, accessToken: tokens.access_token };
      return tokens.access_token;
    } catch (e) {
      if (!(e instanceof AuthError && e.reason === "refresh-failed")) throw e;
      const current = await settle(refreshToken);
      if (current?.accessToken && current.refreshToken !== refreshToken) {
        // Another process refreshed first (or the user signed in again). Its tokens are good.
        return current.accessToken;
      }
      // Only clear the session when the store still holds the token that failed. If it's already
      // empty, another process signed out; there's nothing of ours to remove.
      if (current) await store.remove();
      throw new AuthError("Session expired. Sign in again.", "signed-out");
    }
  }

  /** Single-flight per process: concurrent callers share one refresh. */
  function refresh(refreshToken: string): Promise<string> {
    if (lastRotation?.from === refreshToken) return Promise.resolve(lastRotation.accessToken);
    if (!inFlight) {
      inFlight = rotate(refreshToken).finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  /**
   * Returns a usable access token, refreshing first when it expires within EXPIRY_MARGIN_MS (or
   * when `force` is set after a 401). Throws AuthError("signed-out") when the user needs to sign in.
   */
  async function getAccessToken(opts: GetAccessTokenOptions = {}): Promise<string> {
    const tokens = await store.get();
    if (!tokens?.accessToken) throw new AuthError("Not signed in.", "signed-out");
    const t = now();
    if (opts.rejected && tokens.accessToken !== opts.rejected && !expiresSoon(tokens, t)) {
      // Someone already replaced the rejected token; retry with the new one instead of rotating again.
      return tokens.accessToken;
    }
    if (tokens.refreshToken) {
      if (opts.force || expiresSoon(tokens, t, 0)) return refresh(tokens.refreshToken);
      if (!expiresSoon(tokens, t)) return tokens.accessToken;
      // Refreshing early, while the current token still works. If the refresh fails for any reason
      // other than a dead session (auth worker down or rate-limited, network), keep using the current
      // token rather than failing every request; the next call tries again. If the auth worker is
      // slow, don't hold the request: go ahead with the current token and let the refresh finish on
      // its own (it isn't cut off, since a refresh lost halfway would leave a spent refresh token).
      const early = refresh(tokens.refreshToken).then(
        (accessToken) => ({ accessToken }),
        (error: unknown) => ({ error }),
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      const waited = await Promise.race([
        early,
        new Promise<null>((r) => {
          timer = setTimeout(() => r(null), earlyWait);
        }),
      ]);
      clearTimeout(timer);
      if (!waited) return tokens.accessToken;
      if ("accessToken" in waited) return waited.accessToken;
      if (waited.error instanceof AuthError && waited.error.reason === "signed-out") throw waited.error;
      return tokens.accessToken;
    }
    // No refresh token: nothing to refresh with, so only give up once the token has really expired.
    if (opts.force || expiresSoon(tokens, t, 0)) {
      await store.remove();
      throw new AuthError("Session expired. Sign in again.", "signed-out");
    }
    return tokens.accessToken;
  }

  return { getAccessToken };
}
