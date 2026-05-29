import validator from "validator";

/**
 * Validate a user-supplied URL. Restricts to http/https so the pasted value
 * cannot route a `javascript:`, `file:`, `data:`, or `ftp:` URL into the
 * downstream tools — yt-dlp will silently retry generic extractors on weird
 * schemes, gallery-dl errors cryptically, and monolith may produce surprises.
 * A protocol-less URL like `youtube.com/watch?v=…` is accepted here; callers
 * run it through `normalizeUrl` before handing it to a tool.
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, { require_protocol: false, protocols: ["http", "https"] });
}

/**
 * Prefix `https://` when a (already-validated) URL has no scheme. yt-dlp and
 * gallery-dl tolerate bare hosts, but monolith treats a scheme-less argument
 * like `example.com/page` as a local file path, so the webpage save would fail
 * or write the wrong thing. Normalising once at submit time keeps every runner
 * fed a real URL.
 */
export function normalizeUrl(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}
