/**
 * Gestione della sessione Passig in Raycast.
 *
 * Ogni comando Raycast gira in un processo Node separato e di breve durata:
 * non esiste una memoria condivisa tra un'invocazione e l'altra, e Raycast
 * non espone il Keychain di macOS. Compromesso adottato (vedi README):
 *
 * - `LocalStorage` (persistente): SOLO il refresh token. Permette di riusare
 *   la stessa sessione server senza creare un nuovo login a ogni sblocco, ma
 *   da solo NON consente di decifrare nulla (serve la master password).
 * - `Cache` con TTL = auto-lock (preferenza, default 15 min): snapshot della
 *   sessione sbloccata (userKey/privateKey/vaultKey in base64 + item cifrati
 *   + access token). Scaduto il TTL il file viene cancellato e si richiede la
 *   master password. La master password non viene MAI salvata.
 */
import { Cache, LocalStorage } from "@raycast/api";
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
import { autoLockMs, getPrefs } from "./preferences";

const LS_REFRESH_TOKEN = "passig.refreshToken";
const CACHE_SESSION = "session";

interface CachedSession {
  v: 1;
  expiresAt: number;
  accessToken: string;
  snapshot: SessionSnapshot;
}

const cache = new Cache({ namespace: "passig" });

async function readRefreshToken(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LS_REFRESH_TOKEN)) ?? null;
}

function readCached(): CachedSession | null {
  const raw = cache.get(CACHE_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedSession;
    if (parsed.v !== 1 || parsed.expiresAt <= Date.now()) {
      cache.remove(CACHE_SESSION);
      return null;
    }
    return parsed;
  } catch {
    cache.remove(CACHE_SESSION);
    return null;
  }
}

function writeCached(session: VaultSession, accessToken: string): void {
  const payload: CachedSession = {
    v: 1,
    expiresAt: Date.now() + autoLockMs(),
    accessToken,
    snapshot: session.exportSnapshot(),
  };
  cache.set(CACHE_SESSION, JSON.stringify(payload));
}

/** Crea l'ApiClient con persistenza del refresh token (rotazione) su LocalStorage. */
async function makeApi(tokens: Tokens | null): Promise<ApiClient> {
  const prefs = getPrefs();
  return new ApiClient({
    baseUrl: prefs.serverUrl,
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
  /** Salva lo snapshot aggiornato (dopo load/create/update) e rinnova il TTL. */
  persist: () => void;
  /** Ricarica vault e item dal server e aggiorna la cache. */
  refresh: () => Promise<void>;
}

function wrap(api: ApiClient, vault: VaultSession): ActiveSession {
  const persist = () => {
    const t = api.getTokens();
    if (t) writeCached(vault, t.accessToken);
  };
  return {
    api,
    vault,
    persist,
    refresh: async () => {
      await vault.load();
      persist();
    },
  };
}

/** Restituisce la sessione sbloccata dalla cache, oppure null se serve la master password. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  await initCrypto();
  const cached = readCached();
  if (!cached) return null;
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    cache.remove(CACHE_SESSION);
    return null;
  }
  const api = await makeApi({ accessToken: cached.accessToken, refreshToken });
  const vault = VaultSession.fromSnapshot(api, cached.snapshot);
  return wrap(api, vault);
}

/**
 * Sblocca con la master password.
 * Se esiste un refresh token prova a riusare la sessione server (refresh → /me →
 * derivazione stretchKey → sblocco chiavi); altrimenti esegue il login completo.
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
      // refresh token revocato/scaduto o altro: si passa al login completo
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
  const active = wrap(api, vault);
  active.persist();
  return active;
}

/** Blocca: cancella la cache delle chiavi (il refresh token resta per il prossimo sblocco). */
export function lockSession(): void {
  cache.remove(CACHE_SESSION);
}

/** Logout completo: revoca la sessione server e cancella tutto. */
export async function logoutSession(): Promise<void> {
  const active = await getActiveSession();
  cache.clear();
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
