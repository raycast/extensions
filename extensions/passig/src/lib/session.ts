/**
 * Passig session handling in Raycast.
 *
 * Every Raycast command runs in its own short-lived Node process, so there is no
 * shared memory between invocations, and Raycast does not expose the macOS
 * Keychain. Trade-off (see README):
 *
 * - `passig.refreshToken` (LocalStorage): lets the extension reuse the same server
 *   session without a new login on every unlock. On its own it cannot decrypt
 *   anything: the master password is still required.
 * - `passig.session` (LocalStorage, Raycast's encrypted local database): snapshot
 *   of the unlocked session (user/private/vault keys in base64, encrypted items,
 *   access token) with its own expiry = auto-lock preference (default 15 min).
 *   Expired snapshots are deleted and the master password is asked again.
 *   The master password is NEVER stored.
 */
import { LocalStorage } from "@raycast/api";
import {
  ApiClient,
  InvalidCredentialsError,
  VaultSession,
  login as coreLogin,
  resumeWithMasterPassword,
  type SessionSnapshot,
  type Tokens,
} from "../vendor/client-core/index.js";
import { initCrypto } from "../vendor/shared/index.js";
import { clearIfStillSecret } from "./clipboard";
import { autoLockMs, getPrefs } from "./preferences";

const LS_REFRESH_TOKEN = "passig.refreshToken";
const LS_SESSION = "passig.session";

interface CachedSession {
  v: 2;
  /** Normalized email of the account the snapshot belongs to. */
  email: string;
  expiresAt: number;
  accessToken: string;
  snapshot: SessionSnapshot;
}

async function readRefreshToken(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LS_REFRESH_TOKEN)) ?? null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Reads the stored snapshot. It is discarded (and deleted) when expired, in an old
 * format, or owned by an account other than the one in the preferences: after
 * changing the email the previous account's vaults must never be shown or written.
 */
async function readCached(): Promise<CachedSession | null> {
  const raw = await LocalStorage.getItem<string>(LS_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedSession;
    if (parsed.v !== 2 || parsed.expiresAt <= Date.now() || parsed.email !== normalizeEmail(getPrefs().email)) {
      await LocalStorage.removeItem(LS_SESSION);
      return null;
    }
    return parsed;
  } catch {
    await LocalStorage.removeItem(LS_SESSION);
    return null;
  }
}

async function writeCached(session: VaultSession, accessToken: string, expiresAt: number): Promise<void> {
  const payload: CachedSession = {
    v: 2,
    email: normalizeEmail(getPrefs().email),
    expiresAt,
    accessToken,
    snapshot: session.exportSnapshot(),
  };
  await LocalStorage.setItem(LS_SESSION, JSON.stringify(payload));
}

/** `fetch` that asks the API for English error messages (client-core does not set the header). */
const englishFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", "en");
  return fetch(input, { ...init, headers });
};

/** Creates the ApiClient, persisting the (rotating) refresh token in LocalStorage. */
async function makeApi(tokens: Tokens | null): Promise<ApiClient> {
  const prefs = getPrefs();
  return new ApiClient({
    baseUrl: prefs.serverUrl,
    fetch: englishFetch,
    tokens,
    onTokensChanged: async (t) => {
      if (t) await LocalStorage.setItem(LS_REFRESH_TOKEN, t.refreshToken);
      else await LocalStorage.removeItem(LS_REFRESH_TOKEN);
    },
  });
}

export interface ActiveSession {
  api: ApiClient;
  vault: VaultSession;
  /** Auto-lock time (ms epoch): set at unlock, NOT extended by usage. */
  expiresAt: number;
  /** true once the auto-lock has expired (or the session was locked). */
  isExpired: () => boolean;
  /** Stores the updated snapshot (after load/create/update), keeping the same expiry. */
  persist: () => Promise<void>;
  /** Reloads vaults and items from the server and updates the stored snapshot. */
  refresh: () => Promise<void>;
  /** Locks: deletes the snapshot, zeroes the in-memory keys and clears the clipboard if it holds a secret. */
  lock: () => Promise<void>;
}

function wrap(api: ApiClient, vault: VaultSession, expiresAt: number): ActiveSession {
  let locked = false;
  const isExpired = () => locked || Date.now() >= expiresAt;
  const persist = async () => {
    if (isExpired()) return;
    const t = api.getTokens();
    if (!t) return;
    await writeCached(vault, t.accessToken, expiresAt);
    // locked while writing: never leave a snapshot behind
    if (isExpired()) await lockSession();
  };
  return {
    api,
    vault,
    expiresAt,
    isExpired,
    persist,
    refresh: async () => {
      await vault.load();
      await persist();
    },
    lock: async () => {
      locked = true;
      await lockSession();
      vault.lock();
      await clearIfStillSecret(true);
    },
  };
}

/** Returns the unlocked session from storage, or null when the master password is needed. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  await initCrypto();
  const cached = await readCached();
  if (!cached) return null;
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    await LocalStorage.removeItem(LS_SESSION);
    return null;
  }
  const api = await makeApi({ accessToken: cached.accessToken, refreshToken });
  const vault = VaultSession.fromSnapshot(api, cached.snapshot);
  return wrap(api, vault, cached.expiresAt);
}

/**
 * Unlocks with the master password.
 * With a refresh token it tries to reuse the server session (refresh → /me →
 * stretchKey derivation → key unlock); otherwise it performs a full login.
 */
export async function unlock(masterPassword: string): Promise<ActiveSession> {
  await initCrypto();
  const prefs = getPrefs();
  const refreshToken = await readRefreshToken();

  let api: ApiClient | null = null;
  let vault: VaultSession | null = null;

  if (refreshToken) {
    try {
      api = await makeApi({ accessToken: "", refreshToken });
      const result = await resumeWithMasterPassword(api, masterPassword, prefs.email);
      vault = new VaultSession(api, result.keys);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) throw err;
      // refresh token revoked/expired or other failure: fall back to a full login
      api = null;
      vault = null;
      await LocalStorage.removeItem(LS_REFRESH_TOKEN);
    }
  }

  if (!api || !vault) {
    api = await makeApi(null);
    const result = await coreLogin(api, prefs.email, masterPassword, prefs.deviceName);
    vault = new VaultSession(api, result.keys);
  }

  await vault.load();
  const active = wrap(api, vault, Date.now() + autoLockMs());
  await active.persist();
  return active;
}

/** Lock: deletes the key snapshot (the refresh token is kept for the next unlock). */
export async function lockSession(): Promise<void> {
  await LocalStorage.removeItem(LS_SESSION);
}

/** Full logout: revokes the server session and deletes everything. */
export async function logoutSession(): Promise<void> {
  const active = await getActiveSession();
  await LocalStorage.removeItem(LS_SESSION);
  if (active) {
    await active.api.logout();
  } else {
    const refreshToken = await readRefreshToken();
    if (refreshToken) {
      const api = await makeApi({ accessToken: "", refreshToken });
      await api.logout();
    }
  }
  await LocalStorage.removeItem(LS_REFRESH_TOKEN);
}
