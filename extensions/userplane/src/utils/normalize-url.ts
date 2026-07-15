/**
 * Normalize a user-entered host/URL preference down to a clean `protocol://host` origin.
 *
 * Accepts any of: `api-dev.userplane.io`, `https://api-dev.userplane.io`,
 * `https://api-dev.userplane.io/`, `https://api-dev.userplane.io/api/v1/public`, etc.
 * Always returns `protocol://host` with no trailing slash and no path.
 * Defaults to `https://` when no protocol is given, preserves `http://` for local dev.
 */
export function normalizeOrigin(input: string | undefined, fallbackHost: string): string {
  const raw = input?.trim();
  const candidate = raw && raw.length > 0 ? raw : fallbackHost;
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return `https://${fallbackHost}`;
  }
}
