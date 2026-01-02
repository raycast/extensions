/**
 * Checks if a hostname matches a pattern.
 * Supports exact match and wildcard prefix patterns (e.g., "*.zendesk.com").
 *
 * @param pattern - The pattern to match against (from app config). Can be exact or wildcard.
 * @param hostname - The actual hostname to check (from browser URL).
 * @returns true if hostname matches the pattern.
 */
export function matchesHostname(pattern: string, hostname: string): boolean {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".zendesk.com"
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return pattern === hostname;
}
