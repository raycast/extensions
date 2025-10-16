const urlWithoutHttpRegex = /^https?:\/\//;

/**
 * Returns the supplied URL without the initial http(s).
 *
 * @param  url The URL to remove http(s) from
 * @returns     URL without the initial http(s)
 */
export function withoutHttp(url: string | null): string {
  if (url === "") {
    return "";
  }

  if (!url) {
    return "";
  }

  return url.replace(urlWithoutHttpRegex, "");
}

export function urlToSlug(url: string | null): string | null {
  if (!url) {
    return null;
  }

  return withoutHttp(url).replace(/\//g, "::");
}

/**
 * Removes the `http(s)://` part and the trailing slash from a URL.
 * "http://blog.wordpress.com" will be converted into "blog.wordpress.com".
 * "https://www.wordpress.com/blog/" will be converted into "www.wordpress.com/blog".
 *
 * @param  urlToConvert The URL to convert
 * @returns              The URL's domain and path
 */
export function urlToDomainAndPath(urlToConvert: string | null): string | null {
  return withoutHttp(urlToConvert).replace(/\/$/, "");
}
