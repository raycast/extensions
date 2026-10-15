import { createHash } from "node:crypto";

/** Stable key for OAuth users. OAuth tokens rotate on refresh, so they can't be part of the key. */
export const STORAGE_OAUTH_WORKSPACE_SLUG_KEY = "workspace-slug:oauth";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** LocalStorage key for the workspace slug of an API key. The key name holds a SHA-256 hash, never the token. */
export const STORAGE_WORKSPACE_SLUG_KEY: (token: string) => string = (token: string) =>
  `workspace-slug:sha256:${hashToken(token)}`;

/**
 * Key used by earlier versions, which embedded the raw token in the key name.
 * Read once for migration, then deleted.
 */
export const LEGACY_STORAGE_WORKSPACE_SLUG_KEY: (token: string) => string = (token: string) =>
  `workspace-slug:${token}`;

/** The subset of Raycast's `LocalStorage` the slug lookup needs (injected so it can be tested). */
export type SlugStorage = {
  getItem<T extends string>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** An older key the slug may be stored under. `remove` marks keys whose name holds a raw token. */
export type LegacySlugKey = { key: string; remove: boolean };

/**
 * Older keys an API key's workspace slug may be stored under, in lookup order. `rawToken` is the untrimmed
 * preference: versions before keys were trimmed built both the hashed key and the plaintext key from it.
 */
export function legacyWorkspaceSlugKeys(token: string, rawToken: string = token): LegacySlugKey[] {
  const keys: LegacySlugKey[] = [];
  if (rawToken !== token) keys.push({ key: STORAGE_WORKSPACE_SLUG_KEY(rawToken), remove: false });
  keys.push({ key: LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token), remove: true });
  if (rawToken !== token) keys.push({ key: LEGACY_STORAGE_WORKSPACE_SLUG_KEY(rawToken), remove: true });
  return keys;
}

/**
 * Reads the slug stored under `key`. Failing that, the first older key that holds one is copied to `key`,
 * and every older key whose name contains a token is removed.
 */
export async function findStoredWorkspaceSlug(
  storage: SlugStorage,
  key: string,
  legacyKeys: LegacySlugKey[],
): Promise<string | undefined> {
  const stored = await storage.getItem<string>(key);
  if (stored) return stored;
  for (const legacy of legacyKeys) {
    const value = await storage.getItem<string>(legacy.key);
    if (!value) continue;
    await storage.setItem(key, value);
    for (const { key: legacyKey, remove } of legacyKeys) {
      if (remove) await storage.removeItem(legacyKey);
    }
    return value;
  }
  return undefined;
}
