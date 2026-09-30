import { lookup } from "dns/promises";

/**
 * Guards requests whose URL came from PAGE CONTENT rather than from the user.
 *
 * The distinction is the whole design. The URL the user typed is intent — digging
 * `http://localhost:3000` is a normal thing for a developer to do, and blocking it
 * would break the case Digger is most useful for. A `<link rel="stylesheet">` href
 * is different: it is chosen by whoever wrote the page, so a hostile page can point
 * it at `http://169.254.169.254/latest/meta-data/`, at a router's admin endpoint, or
 * at a service bound to loopback, and have the extension issue that request from
 * inside the user's network.
 *
 * So a discovered sub-resource is allowed when it is on the SAME HOST the user asked
 * about — no new reach — and otherwise must resolve to a public address.
 */

/** Reserved IPv4 ranges that must never be reached from a page-supplied URL. */
function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || // "this" network
    a === 10 || // RFC1918
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local — includes the 169.254.169.254 metadata endpoint
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 168) || // RFC1918
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
}

function isPrivateIPv6(address: string): boolean {
  const a = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (a === "::1" || a === "::") return true;
  if (a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb")) return true; // link-local
  if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique local
  // IPv4-mapped (::ffff:127.0.0.1) reaches the IPv4 stack, so judge the mapped half.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(address: string): boolean {
  return address.includes(":") ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

/** Hostnames that never denote a public host, whatever DNS says. */
const LOCAL_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa"];

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || LOCAL_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

export interface GuardResult {
  allowed: boolean;
  /** Why it was refused, for the log line — never surfaced as a finding about the site. */
  reason?: string;
}

/**
 * Whether a page-supplied URL may be fetched.
 *
 * `pageUrl` is what the user asked to dig. A destination on that same host is
 * already within reach of the dig and is allowed without a DNS check — including a
 * private one, so digging a local dev server still reads its stylesheets.
 *
 * Anything else is resolved first and refused if ANY answer is private. Resolving
 * and then checking is what closes the gap a hostname allow-list leaves open: a
 * public name is free to have an `A` record pointing at 127.0.0.1.
 */
export async function checkPageSuppliedUrl(rawUrl: string, pageUrl: string): Promise<GuardResult> {
  let target: URL;
  let page: URL;
  try {
    target = new URL(rawUrl);
    page = new URL(pageUrl);
  } catch {
    return { allowed: false, reason: "unparseable URL" };
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { allowed: false, reason: `scheme ${target.protocol} is not fetchable` };
  }

  // Same host as the dig itself: no reach the user has not already granted.
  if (target.hostname.toLowerCase() === page.hostname.toLowerCase()) return { allowed: true };

  if (isLocalHostname(target.hostname)) {
    return { allowed: false, reason: "cross-origin host resolves to this machine or a local network" };
  }

  try {
    const addresses = await lookup(target.hostname, { all: true });
    if (addresses.length === 0) return { allowed: false, reason: "no addresses" };
    const privateHit = addresses.find((a) => isPrivateAddress(a.address));
    if (privateHit) {
      return { allowed: false, reason: `cross-origin host resolves to the private address ${privateHit.address}` };
    }
  } catch {
    // A name that will not resolve cannot be fetched anyway, and failing closed
    // here costs nothing.
    return { allowed: false, reason: "host did not resolve" };
  }

  return { allowed: true };
}

/** Redirect hops followed before giving up. Matches what a browser considers reasonable. */
const MAX_REDIRECTS = 5;

/**
 * Fetches a page-supplied URL, re-checking EVERY redirect hop.
 *
 * `redirect: "follow"` would validate only the first URL and then let the server
 * choose the rest — a `302` to `http://169.254.169.254/` defeats any check made
 * before the request. Following manually is the only way the guarantee holds for
 * the destination actually contacted.
 */
export async function fetchPageSuppliedUrl(
  rawUrl: string,
  pageUrl: string,
  init: RequestInit & { signal?: AbortSignal },
): Promise<Response> {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = await checkPageSuppliedUrl(current, pageUrl);
    if (!verdict.allowed) throw new Error(`Refused: ${verdict.reason}`);

    const response = await fetch(current, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status > 399) return response;

    const location = response.headers.get("location");
    // Drain the redirect body; nothing here reads it.
    await response.body?.cancel().catch(() => undefined);
    if (!location) return response;
    current = new URL(location, current).href;
  }

  throw new Error(`Refused: more than ${MAX_REDIRECTS} redirects`);
}
