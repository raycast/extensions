// IP address parsing helpers, ported from the Chrome extension's lib/ip.js.

const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const V4_SRC = `${OCTET}(?:\\.${OCTET}){3}`;
const V4_FULL = new RegExp(`^${V4_SRC}$`);
// Standard IPv6 forms: full, :: compressed, and IPv4-mapped / embedded tails.
const V6_SRC =
  "(?:" +
  [
    "(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}",
    "(?:[0-9a-f]{1,4}:){1,7}:",
    "(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}",
    "(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}",
    "(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}",
    "(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}",
    "(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}",
    "[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}",
    ":(?:(?::[0-9a-f]{1,4}){1,7}|:)",
    `(?:[0-9a-f]{1,4}:){6}${V4_SRC}`,
    `(?:[0-9a-f]{1,4}:){0,5}:${V4_SRC}`,
    `::(?:ffff(?::0{1,4})?:)?${V4_SRC}`,
  ].join("|") +
  ")";
const V6_FULL = new RegExp(`^${V6_SRC}$`, "i");

export type IpVersion = 0 | 4 | 6;

export function version(s: string): IpVersion {
  if (V4_FULL.test(s)) return 4;
  if (V6_FULL.test(s)) return 6;
  return 0;
}

export function isValid(s: string): boolean {
  return version(s) > 0;
}

// Turn a token found in text into a bare IP, or null. Handles "[2001:db8::1]:443",
// "1.2.3.4:8080", "1.2.3.4/24", "8.8.8.8," and friends.
export function clean(token: string): string | null {
  let t = token.trim();
  t = t.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ""); // URL scheme
  t = t.replace(/^[\s"'`<({]+/, ""); // leading punctuation (not '[')
  t = t.split(/[/?#]/)[0]; // path, query, CIDR suffix
  t = t.replace(/[\s"'`>)}.,;!?]+$/, ""); // trailing punctuation (not ']')
  const bracket = t.match(/^\[([^\]]+)\](?::\d{1,5})?$/);
  if (bracket) t = bracket[1];
  else t = t.replace(/^\[|\]$/g, "");
  const v4port = t.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/);
  if (v4port) t = v4port[1];
  t = t.replace(/%[a-z0-9]+$/i, ""); // IPv6 zone id
  if (!isValid(t)) return null;
  if (version(t) === 6 && !/[0-9a-f]/i.test(t.replace(/:/g, ""))) return null; // "::"
  return t;
}

// First IP address found in a piece of text, or null.
const V4_INSIDE = new RegExp(`(?<![\\d.])(${V4_SRC})(?![\\d.])`);
export function extract(text: string | null | undefined): string | null {
  if (!text) return null;
  const direct = clean(text);
  if (direct) return direct;
  for (const tok of String(text).split(/[\s,;()<>"'`|=]+/)) {
    if (tok.length < 7 || tok.length > 80) continue;
    const got = clean(tok);
    if (got) return got;
    // "ip:1.2.3.4", "src=1.2.3.4" and similar prefixes
    const v4 = tok.match(V4_INSIDE);
    if (v4 && clean(v4[1])) return clean(v4[1]);
    const prefixed = tok.match(/^[a-z_-]+:(.+)$/i);
    if (prefixed) {
      const g = clean(prefixed[1]);
      if (g) return g;
    }
  }
  return null;
}

// Human label for addresses that are not routable on the public internet, else null.
export function reservedLabel(s: string): string | null {
  const v = version(s);
  if (v === 4) {
    const o = s.split(".").map(Number);
    if (o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168)) {
      return "Private network address (RFC 1918)";
    }
    if (o[0] === 127) return "Loopback address";
    if (o[0] === 0) return "Reserved address (0.0.0.0/8)";
    if (o[0] === 169 && o[1] === 254) return "Link-local address";
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return "Carrier-grade NAT address (100.64.0.0/10)";
    if (o[0] === 192 && o[1] === 0 && (o[2] === 0 || o[2] === 2)) return "Reserved or documentation address";
    if (o[0] === 198 && (o[1] === 18 || o[1] === 19)) return "Benchmarking address (198.18.0.0/15)";
    if ((o[0] === 198 && o[1] === 51 && o[2] === 100) || (o[0] === 203 && o[1] === 0 && o[2] === 113)) {
      return "Documentation address";
    }
    if (o[0] >= 224 && o[0] <= 239) return "Multicast address";
    if (o[0] >= 240) return "Reserved address (240.0.0.0/4)";
    return null;
  }
  if (v === 6) {
    const l = s.toLowerCase();
    const mapped = l.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return reservedLabel(mapped[1]);
    if (l === "::") return "Unspecified address";
    if (l === "::1") return "Loopback address";
    if (/^f[cd][0-9a-f]{0,2}:/.test(l)) return "Unique local address (fc00::/7)";
    if (/^fe[89ab][0-9a-f]?:/.test(l)) return "Link-local address (fe80::/10)";
    if (/^ff[0-9a-f]{0,2}:/.test(l)) return "Multicast address";
    if (/^2001:db8:/.test(l)) return "Documentation address (2001:db8::/32)";
    return null;
  }
  return "Not an IP address";
}

// A hostname typed or pasted by the user ("example.com", "https://example.com/path", "host:443"), or null.
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}\.?$/i;
export function hostnameFrom(text: string | null | undefined): string | null {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ""); // URL scheme
  t = t.replace(/^[^@/]*@/, ""); // user info
  t = t.split(/[/?#]/)[0]; // path, query, fragment
  t = t.replace(/:\d{1,5}$/, ""); // port
  t = t.replace(/\.$/, "");
  if (!HOSTNAME.test(t) || isValid(t)) return null;
  return t.toLowerCase();
}

export type Target =
  { kind: "ip"; ip: string } | { kind: "host"; host: string } | { kind: "invalid" } | { kind: "empty" };

// What the user typed: an IP address, a hostname to resolve, nonsense, or nothing.
export function parseTarget(text: string): Target {
  if (!text.trim()) return { kind: "empty" };
  const ip = extract(text);
  if (ip) return { kind: "ip", ip };
  const host = hostnameFrom(text);
  if (host) return { kind: "host", host };
  return { kind: "invalid" };
}
