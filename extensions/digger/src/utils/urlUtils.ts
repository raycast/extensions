import { CACHE } from "./config";

/**
 * Normalize a given URL by trimming whitespace, prepending with "https://" if necessary, lowercasing the scheme and hostname, and removing a trailing slash if present.
 * @param {string} url The URL to normalize.
 * @returns {string} The normalized URL.
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  try {
    const urlObj = new URL(normalized);
    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();
    normalized = urlObj.href;
  } catch {
    normalized = normalized.toLowerCase();
  }

  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export { extractUrl, validateUrl } from "./urlText";

/**
 * Check if a string value is a URL (starts with http:// or https://).
 * @param {string} value The value to check.
 * @returns {boolean} true if the value is a URL, false otherwise.
 */
export function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

/**
 * Returns the domain name of a given URL.
 * If the URL is invalid, an empty string is returned.
 * @param {string} url The URL to get the domain name from.
 * @returns {string} The domain name of the given URL.
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url.match(/^https?:\/\//i) ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

/**
 * Returns a cache key for the given URL.
 * The key is CACHE.KEY_PREFIX followed by the normalized URL. The prefix carries
 * a version, so a change to the cached shape retires older entries.
 * @param {string} url The URL to generate a cache key for.
 * @returns {string} The cache key for the given URL.
 */
export function getCacheKey(url: string): string {
  const normalized = normalizeUrl(url);
  // The version lives in CACHE.KEY_PREFIX so the purge in getCacheIndex and the
  // key built here can never disagree about what "current" means.
  return `${CACHE.KEY_PREFIX}${normalized}`;
}

/**
 * Resolves a potentially relative URL to an absolute URL using a base URL.
 * @param {string} url The URL to resolve (can be relative or absolute).
 * @param {string} baseUrl The base URL to resolve against.
 * @returns {string} The absolute URL.
 */
export function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Constructs a URL for a root-level resource (e.g., robots.txt, sitemap.xml, favicon.ico).
 * Uses the origin (scheme + host) of the base URL, ignoring any path.
 * @param {string} resourcePath The resource path (e.g., "/robots.txt" or "robots.txt").
 * @param {string} baseUrl The base URL to extract the origin from.
 * @returns {string | undefined} The absolute URL to the root resource, or undefined if invalid.
 */
export function getRootResourceUrl(resourcePath: string, baseUrl: string): string | undefined {
  try {
    const urlObj = new URL(baseUrl);
    const normalizedPath = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
    return `${urlObj.origin}${normalizedPath}`;
  } catch {
    return undefined;
  }
}

/**
 * Strips the query string and fragment from a URL for logging.
 *
 * Use this for any URL going to `logger.warn`/`.error`, which are NOT gated on
 * the Debug Logging preference and therefore emit for every user. The logger's
 * redactor only scrubs credential-shaped keys (`token=`, `apiKey=`, userinfo);
 * it leaves arbitrary query values alone, so `?email=someone@example.com`
 * reaches the console verbatim. Digger analyzes whatever URL the user hands it,
 * and a query string is the most likely place for something personal to hide.
 *
 * Origin and path are kept: they are what makes a warning actionable, and they
 * are already visible in the UI. Falls back to the origin alone, then to a
 * constant, so logging can never throw on a malformed URL.
 */
/**
 * Every URL inside free text — an error message — redacted as redactUrlForLog
 * does. A warn line that redacts its `url` field but prints the raw error would
 * still leak the query, because transport errors quote the URL they failed on.
 */
export function redactUrlsInText(text: string): string {
  return text.replace(/\bhttps?:\/\/[^\s"'<>)\]]+/gi, (url) => redactUrlForLog(url));
}

export function redactUrlForLog(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return "<unparseable url>";
  }
}
