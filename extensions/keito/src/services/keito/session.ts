import { createHash } from "crypto";
import { KeitoCredentials } from "./config";
import { isKeitoError } from "./errors";
import { KeitoIdentity } from "./types";

/** Subset of Raycast LocalStorage used here; injectable for tests. */
export interface KeyValueStore {
  getItem<T extends string | number | boolean>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string | number | boolean): Promise<void>;
  removeItem(key: string): Promise<void>;
  allItems(): Promise<Record<string, unknown>>;
}

export interface StoredSession {
  fingerprint: string;
  identity: KeitoIdentity;
  verifiedAt: string;
}

export const SESSION_KEY = "keito:session";
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * One-way fingerprint of the configured credentials. Only this truncated digest is stored, so a
 * changed key or Company ID is detected without keeping a copy of the secret.
 */
export function credentialFingerprint(credentials: KeitoCredentials): string {
  return createHash("sha256").update(`${credentials.accountId}\n${credentials.token}`).digest("hex").slice(0, 16);
}

/** Storage scope: one Keito company plus the identity bound to the key. */
export function identityScope(identity: Pick<KeitoIdentity, "companyId" | "userId">): string {
  return `${identity.companyId}:${identity.userId}`;
}

export function scopedKey(scope: string, name: string): string {
  return `keito:${scope}:${name}`;
}

async function readSession(store: KeyValueStore): Promise<StoredSession | undefined> {
  const raw = await store.getItem<string>(SESSION_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    // Sessions saved before workspace settings were read are re-verified.
    if (parsed?.fingerprint && parsed.identity?.userId && parsed.identity?.companyId && parsed.identity.settings)
      return parsed;
  } catch {
    // fall through and treat as missing
  }
  return undefined;
}

export interface ResolvedSession {
  identity: KeitoIdentity;
  scope: string;
  /** True when the identity was fetched from Keito during this call. */
  verified: boolean;
  /** True when the credentials resolve to a different identity than the stored session. */
  accountChanged: boolean;
}

/**
 * Return the identity for the configured credentials, verifying with GET /users/me when the
 * credentials changed, the stored session is stale, or a fresh check is requested.
 */
export async function resolveSession(
  /** API key credentials, or a precomputed fingerprint (OAuth: see oauthFingerprint). */
  credentials: KeitoCredentials | string,
  fetchIdentity: () => Promise<KeitoIdentity>,
  store: KeyValueStore,
  options: { force?: boolean; now?: Date; maxAgeMs?: number } = {},
): Promise<ResolvedSession> {
  const now = options.now ?? new Date();
  const fingerprint = typeof credentials === "string" ? credentials : credentialFingerprint(credentials);
  const stored = await readSession(store);
  const age = stored ? now.getTime() - Date.parse(stored.verifiedAt) : Infinity;

  if (
    stored &&
    stored.fingerprint === fingerprint &&
    !options.force &&
    age >= 0 &&
    age < (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS)
  ) {
    return { identity: stored.identity, scope: identityScope(stored.identity), verified: false, accountChanged: false };
  }

  if (stored && stored.fingerprint !== fingerprint) {
    // Credentials changed: drop the old session before verifying, so a failed check cannot leave
    // the previous identity active.
    await store.removeItem(SESSION_KEY);
  }

  const identity = await fetchIdentity();
  const session: StoredSession = { fingerprint, identity, verifiedAt: now.toISOString() };
  await store.setItem(SESSION_KEY, JSON.stringify(session));
  const scope = identityScope(identity);
  return {
    identity,
    scope,
    verified: true,
    accountChanged: !!stored && identityScope(stored.identity) !== scope,
  };
}

/** Forget the verified identity after Keito rejects the credentials. */
export async function invalidateSessionOnSetupError(error: unknown, store: KeyValueStore): Promise<boolean> {
  if (isKeitoError(error) && error.isSetupProblem) {
    await store.removeItem(SESSION_KEY);
    return true;
  }
  return false;
}

/**
 * Remove local Keito data. Favorites are kept unless requested, because they are user-authored and
 * already separated per company and identity.
 */
export async function resetLocalData(
  store: KeyValueStore,
  options: { includeFavorites?: boolean } = {},
): Promise<number> {
  const keys = Object.keys(await store.allItems());
  let removed = 0;
  for (const key of keys) {
    const isFavorite = /^keito:.+:favorites$/.test(key);
    if (isFavorite && !options.includeFavorites) continue;
    await store.removeItem(key);
    removed++;
  }
  return removed;
}
