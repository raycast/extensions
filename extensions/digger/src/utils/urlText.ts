// No imports: `npm test` loads this file directly, and node --test cannot
// resolve the extensionless relative imports the rest of utils/ uses.

/**
 * Validate whether a given URL is valid or not.
 * @param {string} url The URL to validate.
 * @returns {boolean} true if the URL is valid, false otherwise.
 */
export function validateUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.includes(" ")) {
    return false;
  }
  try {
    const urlObj = new URL(trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extracts the first URL (starting with http:// or https://) found in a string.
 * Useful for handling mixed input like "filename.png https://example.com".
 * @param {string} input The input string to search.
 * @returns {string | null} The first URL found, or null if none.
 */
export function extractUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s<>"')\]]+/);
  if (!match) return null;
  // Strip common trailing punctuation that isn't part of the URL
  const cleaned = match[0].replace(/[.,;:!?]+$/, "");
  return validateUrl(cleaned) ? cleaned : null;
}

/**
 * Scheme-less text whose host is clearly a host: a dotted name ending in a real
 * top-level domain ("raycast.com", "münchen.de", "example.xn--p1ai"), localhost,
 * an IPv4 address, or a bracketed IPv6 one. The host is read by `URL`, which
 * also turns an international name into the punycode its TLD is checked in.
 */
function looksLikeHost(text: string): boolean {
  if (/\s/.test(text)) return false;
  const authority = text.split(/[/?#]/, 1)[0];
  // `chris@example.com` parses as a login on example.com; it is an email address.
  if (authority.includes("@")) return false;
  let host: string;
  try {
    host = new URL(`https://${text}`).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host.startsWith("[")) return true;
  // `URL` reads "1.2" as the address 1.0.0.2; only a fully written one counts.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return authority.replace(/:\d+$/, "") === host;
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  // Every label letters, digits and hyphens (punycode included), as DNS names are.
  const dnsLabel = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return labels.length > 1 && labels.every((label) => dnsLabel.test(label)) && /^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(tld);
}

/**
 * The URL in text the user typed for Digger: a URL with a scheme, a dotted host
 * ("raycast.com/store"), localhost or an IP address — or else the first http(s)
 * URL inside longer text. Not a lone word: `validateUrl` accepts "fart" as
 * https://fart, and that dig fails as a connection error that never says what
 * was typed.
 */
export function urlFromInput(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) && validateUrl(trimmed)) return trimmed;
  return looksLikeHost(trimmed) ? trimmed : extractUrl(trimmed);
}

/**
 * The URL in text the user did not type for Digger — a selection, the clipboard.
 * The same rule as typed input: the lone-word case matters more here, since a
 * copied "Overview" is never a request to dig a host by that name.
 */
export function urlFromAmbientText(text: string): string | null {
  return urlFromInput(text);
}
