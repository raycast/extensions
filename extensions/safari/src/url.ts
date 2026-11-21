// An explicit scheme is either "scheme://..." or "scheme:" not followed by a port ("localhost:3000")
const EXPLICIT_SCHEME = /^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i;

// Local development hosts are usually served over plain http
const LOCAL_HOST = /^(localhost|[^/?#:]+\.localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:[/?#]|$)/i;

/**
 * Parses what a user or the AI calls a web address. Bare hosts such as "raycast.com" or
 * "example.com:8080" get https://, and local hosts such as "localhost:3000" or "[::1]:3000" get http://.
 * Single-word hosts such as "intranet" need an explicit scheme. Only http and https URLs are accepted.
 */
export function parseWebUrl(value: string): URL {
  const trimmed = value.trim();
  const hasScheme = EXPLICIT_SCHEME.test(trimmed);
  const isLocal = LOCAL_HOST.test(trimmed);
  const withScheme = hasScheme ? trimmed : `${isLocal ? "http" : "https"}://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`"${value}" is not a valid URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`"${value}" is not a web URL. Only http:// and https:// addresses can be opened.`);
  }
  if (!url.hostname) {
    throw new Error(`"${value}" is not a valid URL.`);
  }
  // Without a scheme, a single-word host is more likely a typo ("htps//raycast.com") than an intranet site
  if (!hasScheme && !isLocal && !url.hostname.includes(".") && !url.port) {
    throw new Error(`"${value}" is not a valid URL. For an intranet address, start it with http:// or https://.`);
  }
  return url;
}
