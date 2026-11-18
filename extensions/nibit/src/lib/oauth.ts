import { environment, LocalStorage, OAuth, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { AuthSession } from "./secure";
import {
  clearGeneratedApiKey,
  getGeneratedApiKey,
  getGeneratedApiKeyMetadata,
  storeGeneratedApiKey,
} from "./api-key-auth";
import { getExtensionConfig } from "./config";
import { fetchWithTimeout } from "./fetch";
import { debugLog } from "./logger";
// Intentional circular dep: client.ts imports getAuthSession from this module.
// Safe in TS CJS output — values are resolved via property access at call time.
import { clearSecureDeviceData } from "./client";
import {
  isJwtExpired,
  isMalformedStoredSessionError,
  type SupabaseUser,
  userFacingAuthMessage,
  userFromAccessToken,
} from "./oauth-helpers";

const OAUTH_CLIENT_ID = "nibit-raycast";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Nibit",
  providerIcon: "icon.png",
  providerId: "nibit",
  description: "Connect your Nibit account to send and receive encrypted pushes.",
});

const TERMINAL_REFRESH_ERROR_CODES = new Set([
  "refresh_token_not_found",
  // "refresh_token_already_used" is intentionally omitted — it is handled
  // separately by isRefreshTokenReuseFailure() with race-recovery retry logic.
  "invalid_grant",
  "session_not_found",
]);
const AUTH_REFRESH_LOCK_KEY = "meta:auth-refresh-lock";
const AUTH_REFRESH_LOCK_DIR_NAME = "auth-refresh.lock";
const AUTH_REFRESH_LOCK_LEASE_MS = 15_000;
// Must be > LEASE_MS so the waiter can always witness the lease expire before giving up.
// Expressed as LEASE_MS + buffer so bumping LEASE_MS doesn't silently re-introduce the race.
const AUTH_REFRESH_LOCK_WAIT_MS = AUTH_REFRESH_LOCK_LEASE_MS + 5_000; // 20 s
const AUTH_REFRESH_LOCK_POLL_MS = 150;

type NibitAuthBridgeTokenResponse = {
  token_type: "api_key";
  expires_in?: number;
  scope?: string;
  user_id: string;
  api_key: string;
  api_key_id?: string;
  api_key_prefix?: string;
};

type RefreshLock = {
  owner: string;
  expiresAt: number;
};

class SupabaseAuthRefreshError extends Error {
  status: number;
  errorCode: string | null;

  constructor(message: string, status: number, errorCode?: string | null) {
    super(message);
    this.name = "SupabaseAuthRefreshError";
    this.status = status;
    this.errorCode = errorCode ?? null;
    Object.setPrototypeOf(this, SupabaseAuthRefreshError.prototype);
  }
}

function randomLockOwner(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `lock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readRefreshLock(): Promise<RefreshLock | null> {
  const raw = await LocalStorage.getItem<string>(AUTH_REFRESH_LOCK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RefreshLock;
    if (typeof parsed.owner !== "string" || typeof parsed.expiresAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function fileRefreshLockDir(): string | null {
  const supportPath = environment?.supportPath;
  if (!supportPath) return null;
  return path.join(supportPath, AUTH_REFRESH_LOCK_DIR_NAME);
}

function readFileRefreshLock(lockDir: string): RefreshLock | null {
  try {
    const raw = fs.readFileSync(path.join(lockDir, "lease.json"), "utf8");
    const parsed = JSON.parse(raw) as RefreshLock;
    if (typeof parsed.owner !== "string" || typeof parsed.expiresAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function tryAcquireFileRefreshLock(owner: string): boolean | null {
  const lockDir = fileRefreshLockDir();
  if (!lockDir) return null;

  const now = Date.now();
  const next: RefreshLock = {
    owner,
    expiresAt: now + AUTH_REFRESH_LOCK_LEASE_MS,
  };

  try {
    fs.mkdirSync(lockDir, { recursive: false });
    fs.writeFileSync(path.join(lockDir, "lease.json"), JSON.stringify(next));
    return true;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "EEXIST") {
      console.warn("[nibit] tryAcquireFileRefreshLock: falling back to LocalStorage lock", error);
      return null;
    }
  }

  const current = readFileRefreshLock(lockDir);
  if (!current || current.expiresAt <= now) {
    try {
      fs.rmSync(lockDir, { recursive: true, force: true });
      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, "lease.json"), JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  return current.owner === owner;
}

async function tryAcquireLocalStorageRefreshLock(owner: string): Promise<boolean> {
  const current = await readRefreshLock();
  const now = Date.now();
  if (current && current.expiresAt > now && current.owner !== owner) {
    return false;
  }
  const next: RefreshLock = {
    owner,
    expiresAt: now + AUTH_REFRESH_LOCK_LEASE_MS,
  };
  await LocalStorage.setItem(AUTH_REFRESH_LOCK_KEY, JSON.stringify(next));
  const confirmed = await readRefreshLock();
  return confirmed?.owner === owner;
}

async function tryAcquireRefreshLock(owner: string): Promise<boolean> {
  const fileResult = tryAcquireFileRefreshLock(owner);
  if (fileResult !== null) return fileResult;
  return tryAcquireLocalStorageRefreshLock(owner);
}

function releaseFileRefreshLock(owner: string): boolean {
  const lockDir = fileRefreshLockDir();
  if (!lockDir) return false;
  const current = readFileRefreshLock(lockDir);
  if (!current) return false;
  if (current.owner === owner) {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
  return true;
}

async function releaseRefreshLock(owner: string): Promise<void> {
  if (releaseFileRefreshLock(owner)) return;
  const current = await readRefreshLock();
  if (current?.owner === owner) {
    await LocalStorage.removeItem(AUTH_REFRESH_LOCK_KEY);
  }
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const { supabaseUrl, supabaseAnonKey } = getExtensionConfig();
  const response = await fetchWithTimeout(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    15_000,
  );
  if (!response.ok) {
    const payload = await response.text();
    let errorCode: string | null = null;
    try {
      errorCode = (JSON.parse(payload) as { error_code?: string | null }).error_code ?? null;
    } catch {
      errorCode = null;
    }
    throw new SupabaseAuthRefreshError(payload || "Unable to refresh your Nibit session.", response.status, errorCode);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<NibitAuthBridgeTokenResponse> {
  const { authBridgeUrl } = getExtensionConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: OAUTH_CLIENT_ID,
  });
  const response = await fetchWithTimeout(
    `${authBridgeUrl}/auth-bridge/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    30_000,
  );
  if (!response.ok) {
    await response.text().catch(() => "");
    debugLog(`[nibit] auth bridge token exchange failed status=${response.status}`);
    throw new Error("Unable to finish Nibit sign-in. Please try again.");
  }
  const payload = (await response.json()) as Partial<NibitAuthBridgeTokenResponse> & Record<string, unknown>;
  if (payload.token_type !== "api_key" || typeof payload.api_key !== "string" || typeof payload.user_id !== "string") {
    throw new Error("Nibit sign-in returned an unsupported credential response. Please update and try again.");
  }
  return payload as NibitAuthBridgeTokenResponse;
}

function isTerminalRefreshFailure(error: unknown): error is SupabaseAuthRefreshError {
  return (
    error instanceof SupabaseAuthRefreshError &&
    (error.status === 401 ||
      error.status === 403 ||
      (error.status === 400 && TERMINAL_REFRESH_ERROR_CODES.has(error.errorCode ?? "")))
  );
}

function tokenSetChanged(a: OAuth.TokenSet, b: OAuth.TokenSet): boolean {
  return (
    a.accessToken !== b.accessToken ||
    a.refreshToken !== b.refreshToken ||
    a.updatedAt.getTime() !== b.updatedAt.getTime()
  );
}

function isRefreshTokenReuseFailure(error: unknown): error is SupabaseAuthRefreshError {
  return (
    error instanceof SupabaseAuthRefreshError &&
    error.status === 400 &&
    error.errorCode === "refresh_token_already_used"
  );
}

async function tryReuseStoredTokensAfterRefreshRace(
  previousTokens: OAuth.TokenSet,
): Promise<OAuth.TokenSet | undefined> {
  // When a concurrent process wins the refresh race, it may not have written the
  // new tokens to storage yet by the time we check. Retry a few times so we don't
  // immediately give up and clear the session when the winner is mid-write.
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 300;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);
    const latestTokens = await oauthClient.getTokens();
    // No access token yet — winner may be mid-write. Retry rather than bail.
    if (!latestTokens?.accessToken) continue;
    if (tokenSetChanged(latestTokens, previousTokens)) {
      if (!latestTokens.isExpired() || !latestTokens.refreshToken) {
        return latestTokens;
      }
      const refreshed = await refreshTokens(latestTokens.refreshToken);
      await oauthClient.setTokens(refreshed);
      return (await oauthClient.getTokens()) ?? undefined;
    }
  }

  return undefined;
}

async function refreshTokensWithLock(previousTokens: OAuth.TokenSet): Promise<OAuth.TokenSet | undefined> {
  const owner = randomLockOwner();
  const deadline = Date.now() + AUTH_REFRESH_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    if (await tryAcquireRefreshLock(owner)) {
      try {
        const latestTokens = await oauthClient.getTokens();
        if (!latestTokens?.accessToken) {
          console.warn("[nibit] refreshTokensWithLock: no access token in storage after acquiring lock");
          return undefined;
        }
        if (tokenSetChanged(latestTokens, previousTokens) && !latestTokens.isExpired()) {
          debugLog("[nibit] refreshTokensWithLock: another process already refreshed — reusing");
          return latestTokens;
        }
        if (!latestTokens.refreshToken) {
          console.warn("[nibit] refreshTokensWithLock: no refresh token in storage");
          return undefined;
        }
        const refreshed = await refreshTokens(latestTokens.refreshToken);
        await oauthClient.setTokens(refreshed);
        return await oauthClient.getTokens();
      } finally {
        await releaseRefreshLock(owner);
      }
    }

    const latestTokens = await oauthClient.getTokens();
    if (latestTokens?.accessToken && tokenSetChanged(latestTokens, previousTokens) && !latestTokens.isExpired()) {
      debugLog("[nibit] refreshTokensWithLock: lock holder refreshed while we waited — reusing");
      return latestTokens;
    }
    await sleep(AUTH_REFRESH_LOCK_POLL_MS);
  }

  console.warn("[nibit] refreshTokensWithLock: lock wait timed out — attempting race recovery");
  return await tryReuseStoredTokensAfterRefreshRace(previousTokens);
}

export async function signInWithNibit(): Promise<AuthSession> {
  const { authBridgeUrl, appBaseUrl } = getExtensionConfig();
  debugLog(`[nibit] signInWithNibit: starting OAuth (authBridgeUrl=${authBridgeUrl} appBaseUrl=${appBaseUrl})`);
  const request = await oauthClient.authorizationRequest({
    endpoint: `${authBridgeUrl}/auth-bridge/authorize`,
    clientId: OAUTH_CLIENT_ID,
    scope: "openid offline_access",
    extraParameters: {
      client_type: "raycast",
      credential_type: "api_key",
      app_url: appBaseUrl,
    },
  });
  debugLog(`[nibit] signInWithNibit: authorization request ready (redirectURI=${request.redirectURI})`);
  const response = await oauthClient.authorize(request);
  debugLog("[nibit] signInWithNibit: authorization callback received; exchanging code");
  const tokens = await exchangeAuthorizationCode(response.authorizationCode, request.redirectURI, request.codeVerifier);
  await storeGeneratedApiKey(tokens.api_key, {
    userId: tokens.user_id,
    apiKeyId: tokens.api_key_id,
    apiKeyPrefix: tokens.api_key_prefix,
    platform: "raycast",
  });
  await oauthClient.removeTokens();
  return {
    userId: tokens.user_id,
    accessToken: tokens.api_key,
    refreshToken: null,
    expiresAt: null,
    authType: "api_key",
  };
}

/**
 * Returns the current auth session, refreshing the access token if needed.
 *
 * CONTRACT — safe to call from background commands:
 * - Never calls clearAuthSession() on server-side or network failures.
 *   Returns null and logs a warning, but leaves stored tokens intact so
 *   background callers cannot accidentally sign the user out.
 * - The one exception: local token corruption (malformed JWT payload) does
 *   clear stored state, because it cannot be recovered without a fresh sign-in.
 *
 * Use ensureSignedIn() when the caller wants to start an OAuth flow if there
 * is no valid session. Use this function when the caller should skip silently
 * on auth failure (e.g. background sync commands).
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const generatedApiKey = await getGeneratedApiKey();
  const generatedApiKeyMetadata = generatedApiKey ? await getGeneratedApiKeyMetadata() : null;
  if (generatedApiKey && generatedApiKeyMetadata?.userId) {
    return {
      userId: generatedApiKeyMetadata.userId,
      accessToken: generatedApiKey,
      refreshToken: null,
      expiresAt: null,
      authType: "api_key",
    };
  }

  let tokens = await oauthClient.getTokens();
  if (!tokens) {
    console.warn("[nibit] getAuthSession: no stored tokens");
    return null;
  }
  const raycastExpired = tokens.isExpired();
  const jwtExpired = isJwtExpired(tokens.accessToken, 60_000);
  if (raycastExpired || jwtExpired) {
    const tokenAgeMs = tokens.updatedAt ? Date.now() - tokens.updatedAt.getTime() : null;
    console.warn(
      `[nibit] getAuthSession: token needs refresh (raycastExpired=${raycastExpired} jwtExpired=${jwtExpired} tokenAgeMs=${tokenAgeMs})`,
    );
    if (!tokens.refreshToken) {
      console.warn("[nibit] getAuthSession: no refresh token — needs re-authentication");
      return null;
    }
    const previousTokens = tokens;
    try {
      tokens = await refreshTokensWithLock(previousTokens);
      if (!tokens) {
        console.warn("[nibit] getAuthSession: refreshTokensWithLock returned null — needs re-authentication");
        return null;
      }
    } catch (error) {
      if (isRefreshTokenReuseFailure(error)) {
        const reusedTokens = await tryReuseStoredTokensAfterRefreshRace(previousTokens);
        if (reusedTokens?.accessToken) {
          debugLog("[nibit] getAuthSession: reused winner's tokens after refresh race");
          tokens = reusedTokens;
        } else {
          console.warn(
            "[nibit] getAuthSession: refresh_token_already_used and no stored replacement — needs re-authentication",
          );
          return null;
        }
      } else if (isTerminalRefreshFailure(error)) {
        console.warn(
          `[nibit] getAuthSession: terminal refresh failure (status=${error.status} code=${error.errorCode}) — needs re-authentication`,
        );
        return null;
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        // Non-terminal failure (network error, timeout, 5xx) during proactive refresh.
        // If the token is still genuinely valid, continue with it rather than failing
        // the caller — the proactive buffer exists to smooth over expiry, not to
        // create a new failure window.
        // Note: no buffer here (unlike the trigger above) — we only fall back when
        // the token is still live by both measures, so there's no risk of sending an
        // actually-expired token to the API.
        if (!previousTokens.isExpired() && !isJwtExpired(previousTokens.accessToken)) {
          console.warn(
            `[nibit] getAuthSession: non-terminal refresh failure but token still live — continuing (${errMsg})`,
          );
          tokens = previousTokens;
        } else {
          // Expired token and transient network failure — return null so background
          // callers skip gracefully without wiping stored session state.
          console.warn(
            `[nibit] getAuthSession: non-terminal refresh failure on expired token — needs re-authentication (${errMsg})`,
          );
          return null;
        }
      }
    }
  }
  if (!tokens?.accessToken) {
    console.warn("[nibit] getAuthSession: no access token after refresh — needs re-authentication");
    return null;
  }
  let user: SupabaseUser;
  try {
    user = userFromAccessToken(tokens.accessToken);
  } catch (error) {
    if (isMalformedStoredSessionError(error)) {
      // Local data corruption (not a server-side failure) — clear so re-auth works cleanly.
      console.warn("[nibit] getAuthSession: clearing session — malformed stored session (local corruption)");
      await clearAuthSession({ skipSessionSnapshot: true });
      return null;
    }
    throw error;
  }
  return {
    userId: user.id,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresIn ? tokens.updatedAt.getTime() + tokens.expiresIn * 1000 : null,
    authType: "supabase",
  };
}

let activeSignInPromise: Promise<AuthSession | null> | null = null;

async function runSignInFlow(previousUserId: string | null): Promise<AuthSession | null> {
  console.warn("[nibit] ensureSignedIn: no valid session — starting OAuth sign-in flow");

  let session: AuthSession;
  try {
    // signInWithNibit stores a generated API key for the API-key bridge flow.
    session = await signInWithNibit();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nibit sign-in failed",
      message: userFacingAuthMessage(error, "Unable to finish Nibit sign-in."),
    });
    return null;
  }

  // Only clear device state when signing in as a different user. Re-auth as
  // the same user (e.g. after a token refresh failure) should preserve the
  // existing device registration and cached inbox — clearing would generate a
  // new device keypair, making old pushes (encrypted for the old key) unreadable.
  if (previousUserId && previousUserId === session.userId) {
    debugLog("[nibit] ensureSignedIn: re-authenticated as same user — keeping device state");
  } else {
    await clearSecureDeviceData().catch((err) => {
      console.warn("[nibit] ensureSignedIn: clearSecureDeviceData failed after sign-in (non-fatal)", err);
    });
  }
  return session;
}

export async function ensureSignedIn(): Promise<AuthSession | null> {
  const existing = await getAuthSession();
  if (existing) return existing;

  // Capture the previous user ID from stale stored tokens (if any) so we can
  // detect user-switches after re-auth. The token may be expired but the JWT
  // payload is still decodable.
  let previousUserId: string | null = null;
  try {
    const staleTokens = await oauthClient.getTokens();
    if (staleTokens?.accessToken) {
      previousUserId = userFromAccessToken(staleTokens.accessToken).id;
    } else {
      previousUserId = (await getGeneratedApiKeyMetadata())?.userId ?? null;
    }
  } catch {
    // Malformed token — treat as unknown previous user.
  }

  if (activeSignInPromise) {
    debugLog("[nibit] ensureSignedIn: sign-in already in progress — joining existing OAuth flow");
    return activeSignInPromise;
  }

  activeSignInPromise = runSignInFlow(previousUserId).finally(() => {
    activeSignInPromise = null;
  });
  return activeSignInPromise;
}

async function revokeGeneratedApiKeyRemote(apiKeyOverride?: string | null): Promise<boolean> {
  const apiKey = apiKeyOverride ?? (await getGeneratedApiKey());
  // No API key means there is no API-key-bound Raycast device/session to revoke.
  if (!apiKey) return true;
  const { authBridgeUrl } = getExtensionConfig();
  const response = await fetchWithTimeout(
    `${authBridgeUrl}/v1/api-key/revoke-self`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    10_000,
  ).catch((error) => {
    console.warn("[nibit] revokeGeneratedApiKeyRemote failed", error);
    return null;
  });
  await response?.text().catch(() => {});
  return response?.ok ?? false;
}

export async function clearAuthSession(
  options: { notifyRevokeFailure?: boolean; skipSessionSnapshot?: boolean } = {},
): Promise<void> {
  // Capture auth before removing credentials. When called from malformed-token
  // recovery, skip getAuthSession() to avoid recursively re-entering cleanup.
  const session = options.skipSessionSnapshot ? null : await getAuthSession();
  const apiKey = session?.authType === "api_key" ? session.accessToken : await getGeneratedApiKey();
  const revoked = await revokeGeneratedApiKeyRemote(apiKey);
  await Promise.all([oauthClient.removeTokens(), clearGeneratedApiKey()]);
  await clearSecureDeviceData({ deactivateSession: apiKey && revoked ? null : session });
  if (!revoked && options.notifyRevokeFailure) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Signed out locally",
      message: "Could not confirm remote API-key revocation. Revoke this Raycast key from Nibit API Keys if needed.",
    });
  }
}
