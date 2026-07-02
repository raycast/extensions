/**
 * Conservative URL detection for a *single* piece of selected text.
 *
 * The bar is intentionally high: a multi-word selection (which contains
 * whitespace) is always treated as a search query, never a URL. Only a single
 * token that clearly names a web address counts. This keeps "rust lifetimes"
 * a search while "github.com/raycast/extensions" opens directly.
 *
 * Precision over recall: a false negative just runs a search (safe, recoverable),
 * whereas a false positive opens a bogus address like `https://config.json`. So a
 * bare `host.tld` only counts when it has a path/query OR a recognizable TLD —
 * this rejects `config.json`, `index.js`, `README.md` while accepting `github.com`.
 */

// Common TLDs that make a bare `host.tld` (no path) confidently a URL.
// Deliberately excludes TLDs that are also everyday file/bundle extensions
// (app, sh, so, pkg, dmg, …) so selecting `Photos.app` or `deploy.sh` searches
// rather than opening a bogus address.
const COMMON_TLDS = new Set([
  "com",
  "org",
  "net",
  "io",
  "dev",
  "ai",
  "co",
  "gov",
  "edu",
  "info",
  "me",
  "xyz",
  "tv",
  "uk",
  "us",
  "ca",
  "de",
  "fr",
  "eu",
  "au",
  "jp",
  "nl",
]);

// Host shape: one or more dot-separated labels ending in a 2+ letter TLD,
// optional port, optional path/query/fragment. No whitespace anywhere.
const HOST = /^(?:[a-z0-9-]+\.)+([a-z]{2,})(?::\d+)?(?:([/?#])\S*)?$/i;

/**
 * True when `text` looks like a web address we should open directly rather than
 * search for. Matches `http(s)://…`, `www.…`, and bare `domain.tld[/path]` — the
 * last only when a path is present or the TLD is well-known. Other schemes
 * (mailto:, file:, custom app schemes) return false.
 */
export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  // An explicit http(s):// scheme means the user already told us it's a URL —
  // open it as-is, including dotless hosts (localhost, http://router/, IPv6).
  if (/^https?:\/\/\S+/i.test(trimmed)) return true;

  // Bare localhost (common for dev servers) — no dot, so it won't match HOST.
  if (/^localhost(?::\d+)?(?:[/?#]\S*)?$/i.test(trimmed)) return true;

  const m = HOST.exec(trimmed);
  if (!m) return false;

  const tld = m[1].toLowerCase();
  const hasPath = m[2] !== undefined;
  // A bare host with no path is only a URL when its TLD is well-known; a path
  // (or query/fragment) makes it a URL regardless of TLD.
  return hasPath || COMMON_TLDS.has(tld);
}

/**
 * Normalize a detected URL to an openable form by prepending a scheme when none
 * is present. Assumes `isUrl(text)` already returned true. Uses `http://` for
 * localhost (dev servers rarely have TLS) and `https://` otherwise.
 */
export function normalizeUrl(text: string): string {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(?::\d+)?(?:[/?#]|$)/i.test(trimmed)) return `http://${trimmed}`;
  return `https://${trimmed}`;
}
