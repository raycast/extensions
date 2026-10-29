export const ASIDE_URL_SCHEMES = ["http:", "https:", "ftp:", "file:", "chrome:", "about:"] as const;

const WEB_URL_SCHEMES = ["http:", "https:", "ftp:"] as const;
const EXPLICIT_SCHEME_PATTERN = /^([a-z][\w+.-]*):/i;
const LOCALHOST_PATTERN = /^localhost(?::\d+)?(?:[/?#]|$)/i;
const BARE_HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;

// Heuristic URL detection (domain.tld or localhost), tolerant of missing protocol.
const URL_PATTERN =
  /^(?:(?:https?|ftp):\/\/\S+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:[/:?#]\S*)?|localhost(?::\d+)?(?:\/\S*)?)$/i;

export function isURL(value: string): boolean {
  if (!value) return false;
  return URL_PATTERN.test(value.trim());
}

export function normalizeURL(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("URL must not be empty.");
  if (LOCALHOST_PATTERN.test(trimmed)) return `http://${trimmed}`;
  if (BARE_HOST_PATTERN.test(trimmed)) return `https://${trimmed}`;

  const explicitScheme = trimmed.match(EXPLICIT_SCHEME_PATTERN)?.[1]?.toLowerCase();
  if (explicitScheme) {
    const protocol = `${explicitScheme}:`;
    if (!(WEB_URL_SCHEMES as readonly string[]).includes(protocol)) {
      throw new Error(`URL scheme "${protocol}" is not supported.`);
    }
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function normalizeAsideURL(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("URL must not be empty.");
  if (LOCALHOST_PATTERN.test(trimmed) || BARE_HOST_PATTERN.test(trimmed)) return normalizeURL(trimmed);

  const explicitScheme = trimmed.match(EXPLICIT_SCHEME_PATTERN)?.[1]?.toLowerCase();
  if (!explicitScheme) return normalizeURL(trimmed);

  const protocol = `${explicitScheme}:`;
  if (!(ASIDE_URL_SCHEMES as readonly string[]).includes(protocol)) {
    throw new Error(`URL scheme "${protocol}" cannot be opened in Aside.`);
  }
  return trimmed;
}

export function normalizeAndValidateURL(value: string): string {
  const normalized = normalizeURL(value);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("URL is malformed.");
  }
  if (!["http:", "https:", "ftp:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("URL must use HTTP, HTTPS, or FTP.");
  }
  return parsed.toString();
}

export function extractDomain(url: string): string {
  try {
    return new URL(normalizeAsideURL(url)).hostname || url;
  } catch {
    return url;
  }
}
