/**
 * The vocabulary and pure decisions behind the setup gate: what "ready" means,
 * which scopes matter, and what counts as blocked. Kept free of Raycast and
 * Node imports so it stays testable on its own.
 */

/** The scopes the extension needs, and what breaks without each. */
export const REQUIRED_SCOPES = [
  { name: "repo", why: "Read pull requests and post replies, including in private repositories" },
  { name: "read:org", why: "Detect your organizations and teams" },
] as const;

export type GhStatus =
  /** Everything works. `missingScopes` may still list advisory gaps. */
  | { state: "ready"; login: string; scopes: string[]; missingScopes: string[] }
  /** No `gh` binary anywhere we look, or the configured path doesn't exist. */
  | { state: "not-installed"; detail: string }
  /** `gh` is there but has no usable token. */
  | { state: "not-authenticated"; detail: string }
  /** Authenticated, but GitHub itself couldn't be reached or rejected us. */
  | { state: "unreachable"; detail: string };

/**
 * Pulls the scope list out of `gh auth status`, which prints a line like
 * `- Token scopes: 'gist', 'read:org', 'repo'`. Quoting varies across gh
 * versions, and fine-grained tokens omit the line entirely.
 */
export function parseScopes(output: string): string[] {
  const match = /Token scopes:\s*(.+)/i.exec(output);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

/**
 * Which required scopes are absent. An empty `scopes` list means the token
 * doesn't report classic scopes at all (fine-grained tokens don't), so nothing
 * is reported missing rather than everything.
 */
export function missingScopesFrom(scopes: string[]): string[] {
  if (scopes.length === 0) return [];
  return REQUIRED_SCOPES.filter((s) => !scopes.includes(s.name)).map((s) => s.name);
}

/**
 * Reports whether the extension can do anything useful at all. `repo` is the
 * one scope with no partial mode — without it the searches come back empty and
 * every write action fails — so a token missing it counts as unconfigured.
 * A missing `read:org` only costs the org and team pickers, so it warns rather
 * than blocks.
 */
export function isBlocked(status: GhStatus): boolean {
  return status.state !== "ready" || status.missingScopes.includes("repo");
}
