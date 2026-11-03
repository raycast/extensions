/**
 * Where `scripts/smoke.ts` may point: the dev deployment or a local backend,
 * nothing else. An allowlist, not a prod blocklist — a pattern that only
 * refuses `https://convex-site.nyxe.app` lets `…nyxe.app:443`, a trailing
 * space or a trailing dot straight through.
 */
const ALLOWED_HTTPS_HOSTS = new Set(["convex-site-dev.nyxe.app"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The normalized origin to use, or null when the target isn't allowed. */
export function smokeBaseUrl(raw: string | undefined): string | null {
  if (!raw || raw !== raw.trim()) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  const host = url.hostname.toLowerCase();
  if (url.protocol === "https:" && ALLOWED_HTTPS_HOSTS.has(host) && url.port === "") return url.origin;
  if ((url.protocol === "http:" || url.protocol === "https:") && LOCAL_HOSTS.has(host)) return url.origin;
  return null;
}
