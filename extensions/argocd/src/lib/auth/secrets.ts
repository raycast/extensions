/**
 * Where credentials live, and the keys they live under.
 *
 * They live in Raycast's own storage, which its documentation describes as a "local encrypted
 * database" whose contents "can only be accessed by the corresponding extension", and which
 * names `password` preferences as the way "to ask users for values such as access tokens".
 *
 * This replaced a detour through the macOS keychain, reached by shelling out to
 * `/usr/bin/security`. That detour existed on the belief that Raycast's storage was
 * unencrypted, which was asserted without being checked and is wrong. It cost two bugs of its
 * own (a write that stored nothing and reported success, then a stdin fix that worked in a
 * shell and not in Raycast), forced the token through argv where `ps` could see it, and would
 * have been rejected outright by the Raycast store, whose checklist says extensions requesting
 * Keychain Access are refused.
 *
 * The store itself is injected, so the key naming and the validation are testable without
 * Raycast, and so nothing here can reach the outside world on its own.
 */

export interface SecretStore {
  read(key: string): Promise<string | undefined>;
  write(key: string, value: string): Promise<void>;
  clear(key: string): Promise<void>;
}

/** One namespace, one key per instance and purpose, so the two can never collide. */
const PREFIX = "secret/v1";

export function tokenKey(instanceId: string): string {
  return `${PREFIX}/${instanceId}/token`;
}

export function sessionKey(instanceId: string): string {
  return `${PREFIX}/${instanceId}/sso`;
}

/**
 * The renewal derived from the argocd CLI's refresh token. Kept apart from the `sso` session so
 * switching an instance between the two modes cannot make one read the other's token.
 */
export function cliSessionKey(instanceId: string): string {
  return `${PREFIX}/${instanceId}/cli`;
}

/** True for a key this module owns, used when clearing everything for one instance. */
export function isSecretKey(key: string, instanceId: string): boolean {
  return key === tokenKey(instanceId) || key === sessionKey(instanceId) || key === cliSessionKey(instanceId);
}

export class SecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretError";
  }
}

/**
 * Trims and refuses what cannot be a bearer token. An empty value stored silently is what the
 * keychain bug looked like from the outside, so it is refused here rather than written.
 */
export function normalizeToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new SecretError("Refusing to store an empty token.");
  }
  if (/[\r\n]/.test(trimmed)) {
    throw new SecretError("The token contains a line break. Paste it as one line.");
  }
  return trimmed;
}

/**
 * Writes a value and reads it back before reporting success.
 *
 * The read-back is not paranoia inherited from the keychain: it is the one habit worth keeping
 * from it. A write whose effect is never checked is how "stored" came to mean "the call
 * returned", twice.
 */
export async function writeVerified(store: SecretStore, key: string, value: string): Promise<void> {
  await store.write(key, value);
  const stored = await store.read(key);
  if (stored !== value) {
    throw new SecretError("The value was not stored. Nothing was saved.");
  }
}

export async function writeToken(store: SecretStore, instanceId: string, raw: string): Promise<void> {
  await writeVerified(store, tokenKey(instanceId), normalizeToken(raw));
}

export async function readToken(store: SecretStore, instanceId: string): Promise<string | undefined> {
  const value = await store.read(tokenKey(instanceId));
  return value && value.length > 0 ? value : undefined;
}

export async function clearToken(store: SecretStore, instanceId: string): Promise<void> {
  await store.clear(tokenKey(instanceId));
}

export async function readSessionRaw(store: SecretStore, instanceId: string): Promise<string | undefined> {
  return store.read(sessionKey(instanceId));
}

export async function writeSessionRaw(store: SecretStore, instanceId: string, raw: string): Promise<void> {
  await writeVerified(store, sessionKey(instanceId), raw);
}

export async function clearSession(store: SecretStore, instanceId: string): Promise<void> {
  await store.clear(sessionKey(instanceId));
}

export async function readCliSessionRaw(store: SecretStore, instanceId: string): Promise<string | undefined> {
  return store.read(cliSessionKey(instanceId));
}

export async function writeCliSessionRaw(store: SecretStore, instanceId: string, raw: string): Promise<void> {
  await writeVerified(store, cliSessionKey(instanceId), raw);
}

export async function clearCliSession(store: SecretStore, instanceId: string): Promise<void> {
  await store.clear(cliSessionKey(instanceId));
}

/** Everything an instance owns, for when it is removed. */
export async function clearInstanceSecrets(store: SecretStore, instanceId: string): Promise<void> {
  await clearToken(store, instanceId);
  await clearSession(store, instanceId);
  await clearCliSession(store, instanceId);
}
