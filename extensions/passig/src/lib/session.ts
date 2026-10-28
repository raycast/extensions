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
import { acceptLanguage } from "../i18n";
import { clearIfStillSecret } from "./clipboard";
import { autoLockMs, getPrefs } from "./preferences";

const LS_REFRESH_TOKEN = "passig.refreshToken";
const CACHE_SESSION = "session";

interface CachedSession {
  v: 2;
  /** Email (normalizzata) dell'account a cui appartiene lo snapshot. */
  email: string;
  expiresAt: number;
  accessToken: string;
  snapshot: SessionSnapshot;
}

const cache = new Cache({ namespace: "passig" });

async function readRefreshToken(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LS_REFRESH_TOKEN)) ?? null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Legge lo snapshot in cache. Lo scarta (e lo cancella) se è scaduto, se ha un
 * formato vecchio o se appartiene a un account diverso da quello configurato
 * nelle preferenze: cambiando email non si devono mai vedere/scrivere i vault
 * dell'account precedente.
 */
function readCached(): CachedSession | null {
  const raw = cache.get(CACHE_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedSession;
    if (parsed.v !== 2 || parsed.expiresAt <= Date.now() || parsed.email !== normalizeEmail(getPrefs().email)) {
      cache.remove(CACHE_SESSION);
      return null;
    }
    return parsed;
  } catch {
    cache.remove(CACHE_SESSION);
    return null;
  }
}

function writeCached(session: VaultSession, accessToken: string, expiresAt: number): void {
  const payload: CachedSession = {
    v: 2,
    email: normalizeEmail(getPrefs().email),
    expiresAt,
    accessToken,
    snapshot: session.exportSnapshot(),
  };
  cache.set(CACHE_SESSION, JSON.stringify(payload));
}

/**
 * `fetch` che aggiunge `Accept-Language` con la lingua attiva: l'API traduce i
 * messaggi d'errore in base a questo header (client-core non lo imposta da solo).
 */
const localizedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", acceptLanguage());
  return fetch(input, { ...init, headers });
};

/** Crea l'ApiClient con persistenza del refresh token (rotazione) su LocalStorage. */
async function makeApi(tokens: Tokens | null): Promise<ApiClient> {
  const prefs = getPrefs();
  return new ApiClient({
    baseUrl: prefs.serverUrl,
    fetch: localizedFetch,
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
  /** Istante (ms epoch) dell'auto-lock: fissato allo sblocco, NON rinnovato dall'uso. */
  expiresAt: number;
  /** true se l'auto-lock è scaduto (o la sessione è stata bloccata). */
  isExpired: () => boolean;
  /** Salva lo snapshot aggiornato (dopo load/create/update) mantenendo la scadenza. */
  persist: () => void;
  /** Ricarica vault e item dal server e aggiorna la cache. */
  refresh: () => Promise<void>;
  /** Blocca: cancella la cache, azzera le chiavi in memoria e svuota gli appunti se contengono un segreto. */
  lock: () => Promise<void>;
}

function wrap(api: ApiClient, vault: VaultSession, expiresAt: number): ActiveSession {
  let locked = false;
  const isExpired = () => locked || Date.now() >= expiresAt;
  const persist = () => {
    if (isExpired()) return;
    const t = api.getTokens();
    if (t) writeCached(vault, t.accessToken, expiresAt);
  };
  return {
    api,
    vault,
    expiresAt,
    isExpired,
    persist,
    refresh: async () => {
      await vault.load();
      persist();
    },
    lock: async () => {
      locked = true;
      lockSession();
      vault.lock();
      await clearIfStillSecret(true);
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
  return wrap(api, vault, cached.expiresAt);
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
  const active = wrap(api, vault, Date.now() + autoLockMs());
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
