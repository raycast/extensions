export function looksLikeUrl(input: string): boolean {
  if (!input) return false;
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please enter a URL.");

  // Convenience: allow "example.com" without scheme, but reject non-http(s) schemes explicitly.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new Error(`"${trimmed}" doesn't look like a URL.`);
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("URL must start with http:// or https://");

  // Without a scheme we are guessing, so require a host that actually looks
  // like one. Otherwise "hello" becomes https://hello/ and "2130706433"
  // becomes https://127.0.0.1/ — both then fail later as confusing DNS errors.
  // An explicit scheme is taken at face value, so intranet hosts still work.
  if (!hasScheme && !looksLikeHostname(typedHost(trimmed))) throw new Error(`"${trimmed}" doesn't look like a URL.`);

  return u.toString();
}

/**
 * The host as the user actually typed it, before the URL parser normalizes it.
 * Needed because WHATWG expands IPv4 shorthand — "3.5" parses to hostname
 * "3.0.0.5", which is indistinguishable from a real dotted quad after the fact.
 */
function typedHost(input: string): string {
  const authority = input.split(/[/?#]/, 1)[0];
  const afterUserinfo = authority.slice(authority.lastIndexOf("@") + 1);
  return afterUserinfo.replace(/:\d*$/, "").toLowerCase();
}

function looksLikeHostname(host: string): boolean {
  if (host === "localhost") return true;
  if (host.startsWith("[")) return true; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // dotted IPv4
  // A real TLD: letters only, or a punycode (IDN) label.
  return /\.[a-z]{2,}$/.test(host) || /\.xn--[a-z0-9-]+$/.test(host);
}

/**
 * Non-throwing normalizeUrl, for input a user supplied deliberately (a command
 * argument or the form field). Unlike looksLikeUrl this accepts scheme-less
 * input such as "example.com", so the convenience built into normalizeUrl is
 * actually reachable. Returns null when the input can't be a http(s) URL.
 */
export function tryNormalizeUrl(input: string | undefined): string | null {
  if (!input?.trim()) return null;
  try {
    return normalizeUrl(input);
  } catch {
    return null;
  }
}
