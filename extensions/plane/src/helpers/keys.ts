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
