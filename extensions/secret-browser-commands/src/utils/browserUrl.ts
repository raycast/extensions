/**
 * Build the full URL for a browser command path.
 *
 * Most paths are bare ("settings") and take the browser's scheme. A few are already absolute
 * ("chrome-untrusted://compose") and must be used as-is — prefixing those produced
 * "chrome://chrome-untrusted://compose", which is the defect this single helper exists to prevent.
 *
 * Everything that shows, copies, or opens a URL goes through here, so those three can never
 * disagree. `src/utils/check-paths.mjs` enforces the matching invariant on the data side: no
 * catalog path may contain "://" unless it is a chrome-untrusted:// URL.
 */
export function buildBrowserUrl(scheme: string, path: string): string {
  return path.includes("://") ? path : `${scheme}${path}`;
}
