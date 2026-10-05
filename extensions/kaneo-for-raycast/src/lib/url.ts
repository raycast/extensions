/** Normalize a user-provided instance URL: trim stray whitespace and a trailing slash. */
export function normalizeInstanceUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}
