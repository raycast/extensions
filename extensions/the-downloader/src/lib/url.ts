import validator from "validator";

/**
 * Validate a user-supplied URL. Restricts to http/https so the pasted value
 * cannot route a `javascript:`, `file:`, `data:`, or `ftp:` URL into the
 * downstream tools — yt-dlp will silently retry generic extractors on weird
 * schemes, gallery-dl errors cryptically, and monolith may produce surprises.
 * A protocol-less URL like `youtube.com/watch?v=…` is still accepted (it gets
 * prefixed with `https://` at use sites).
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, { require_protocol: false, protocols: ["http", "https"] });
}
