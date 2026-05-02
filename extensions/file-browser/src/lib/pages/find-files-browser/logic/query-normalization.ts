const INTERNAL_WHITESPACE_REGEX = /\s+/g;

/**
 * Normalizes a query string by trimming whitespace and collapsing
 * internal runs of whitespace into single spaces.
 *
 * Guards against null/undefined to prevent hard crashes in production.
 */
export function normalizeQuery(query: unknown): string {
  const str = query == null ? "" : String(query);
  return str.trim().replace(INTERNAL_WHITESPACE_REGEX, " ");
}
