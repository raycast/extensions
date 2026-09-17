import { getDomain } from "tldts";

/**
 * Registrable ("apex") domain per the Public Suffix List, e.g. gist.github.com → github.com, www.bbc.co.uk → bbc.co.uk.
 * Private suffixes count, so foo.github.io → foo.github.io rather than github.io.
 * Null for IPs, localhost and anything without a public suffix.
 */
export function apexDomain(url: URL): string | null {
  return getDomain(url.hostname, { allowPrivateDomains: true });
}

/** Finicky matcher source for exactly this hostname. */
export function hostMatcher(url: URL): string {
  return `finicky.matchHostnames(${JSON.stringify(url.hostname)})`;
}

/** Finicky matcher source for the apex domain itself and every subdomain. */
export function apexMatcher(apex: string): string {
  const escaped = apex.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return `finicky.matchHostnames([${JSON.stringify(apex)}, /\\.${escaped}$/])`;
}
