/**
 * Host/pattern normalisation, mirrored from ProxyManager's
 * `IntegrationValidator.normalizeTargetPattern`.
 *
 * This module deliberately imports nothing: it is the one piece of the
 * extension that runs outside the Raycast runtime, so `bun test` can cover it.
 */

export type PatternResult = { ok: true; pattern: string } | { ok: false; error: string };

const ALLOWED_CHARACTERS = /^[a-z0-9.:_*-]+$/;
const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Removes wrapping quotes/angle brackets and the punctuation that rides along with a copied link. */
function unwrap(raw: string): string {
  // Brackets are NOT stripped here: `[2001:db8::1]:8080` needs them intact so the
  // IPv6 address can be told apart from its port.
  return raw
    .trim()
    .replace(/^[<("'`]+/, "")
    .replace(/[>)"'`.,;:!?]+$/, "")
    .trim();
}

/** Lowercases, strips a bracketed IPv6 literal's brackets, one numeric port and trailing dots. */
function canonicalize(value: string): string {
  let host = value.toLowerCase();

  while (host.endsWith(".") && host !== "*") host = host.slice(0, -1);

  if (host.startsWith("[")) {
    const close = host.indexOf("]");
    if (close > 0) host = host.slice(1, close);
  } else {
    const lastColon = host.lastIndexOf(":");
    if (lastColon > 0 && host.indexOf(":") === lastColon) {
      const port = host.slice(lastColon + 1);
      if (/^\d+$/.test(port)) host = host.slice(0, lastColon);
    }
  }

  while (host.endsWith(".") && host !== "*") host = host.slice(0, -1);
  return host;
}

/** Validates a value the way the app will, so the form fails before the socket call. */
export function normalizePattern(raw: string): PatternResult {
  if (raw.trim() === "") return { ok: false, error: "Enter a host, for example api.example.com" };
  if (/\s/.test(raw.trim())) return { ok: false, error: "A target cannot contain spaces" };

  const pattern = canonicalize(raw.trim());

  if (pattern.length > 253) return { ok: false, error: "That host is too long" };
  if (pattern === "" || pattern === "*") {
    return { ok: false, error: "A target needs a host, not a bare wildcard" };
  }
  if (!ALLOWED_CHARACTERS.test(pattern)) {
    return {
      ok: false,
      error: "Only letters, digits, dots, dashes, underscores and one * are allowed",
    };
  }
  if (pattern.endsWith(":")) return { ok: false, error: "The target ends with an empty port" };

  if (!pattern.includes(".") && !pattern.includes(":") && pattern !== "localhost") {
    return {
      ok: false,
      error: "That looks incomplete — enter a full host, for example api.example.com",
    };
  }

  if (pattern.includes("*")) {
    const suffix = pattern.slice(2);
    if (!pattern.startsWith("*.") || suffix.includes("*") || suffix.length < 2) {
      return { ok: false, error: "Wildcards look like *.example.com" };
    }
  }

  return { ok: true, pattern };
}

/**
 * Turns whatever the user had on the clipboard or typed as an argument — a URL,
 * a host with a port, a wildcard pattern — into a target pattern.
 */
export function hostFromInput(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const firstToken = unwrap(raw).split(/\s+/)[0] ?? "";
  if (!firstToken) return null;

  let candidate = firstToken;

  if (candidate.startsWith("*.")) {
    candidate = candidate.slice(2);
    const end = candidate.search(/[/:?#]/);
    if (end >= 0) candidate = candidate.slice(0, end);
    const result = normalizePattern(`*.${candidate}`);
    return result.ok ? result.pattern : null;
  }

  if (SCHEME.test(candidate) || candidate.includes("/") || candidate.includes("?")) {
    try {
      const url = new URL(SCHEME.test(candidate) ? candidate : `https://${candidate}`);
      candidate = url.hostname;
    } catch {
      return null;
    }
  }

  const result = normalizePattern(candidate);
  return result.ok ? result.pattern : null;
}

export function isWildcard(pattern: string): boolean {
  return pattern.startsWith("*.");
}

/** The base host a wildcard covers, so `api.example.com` can be shown as "covered by *.example.com". */
export function wildcardBase(pattern: string): string {
  return isWildcard(pattern) ? pattern.slice(2) : pattern;
}

/**
 * The target pattern that routes `host` — an exact rule first, then the closest
 * wildcard — or `null` when nothing matches.
 */
export function matchingPattern(host: string, patterns: string[]): string | null {
  if (patterns.includes(host)) return host;
  for (const candidate of patterns) {
    if (!isWildcard(candidate)) continue;
    const base = candidate.slice(2);
    if (host === base || host.endsWith(`.${base}`)) return candidate;
  }
  return null;
}

/**
 * Whether `pattern` is already routed — exactly, or by a wildcard above it.
 * Used to decide if a suggestion would change anything.
 */
export function isCoveredByPatterns(pattern: string, patterns: string[]): boolean {
  return matchingPattern(pattern, patterns) !== null;
}
