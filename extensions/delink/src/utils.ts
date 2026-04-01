export interface ParsedParam {
  key: string;
  value: string;
  decodedValue: string;
}

export interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: ParsedParam[];
}

/**
 * Parses a URL string and extracts its query parameters.
 *
 * URLSearchParams.forEach() automatically percent-decodes values, so we
 * manually parse the raw query string to preserve the original encoded form.
 */
export function parseUrl(rawUrl: string): ParsedUrl | null {
  try {
    const trimmed = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
    const parsed = new URL(trimmed);

    const rawValueMap = new Map<string, string[]>();
    const rawQueryString = parsed.search.slice(1); // strip leading "?"
    for (const segment of rawQueryString.split("&")) {
      const equalsIndex = segment.indexOf("=");
      if (equalsIndex === -1) continue;
      const rawKey = segment.slice(0, equalsIndex);
      const rawValue = segment.slice(equalsIndex + 1);
      const decodedKey = decodeURIComponent(rawKey);
      if (!rawValueMap.has(decodedKey)) rawValueMap.set(decodedKey, []);
      rawValueMap.get(decodedKey)!.push(rawValue);
    }

    const keyOccurrenceCount = new Map<string, number>();
    const params: ParsedParam[] = [];
    parsed.searchParams.forEach((decodedValue, key) => {
      const occurrenceIndex = keyOccurrenceCount.get(key) ?? 0;
      keyOccurrenceCount.set(key, occurrenceIndex + 1);
      const rawValue = rawValueMap.get(key)?.[occurrenceIndex] ?? decodedValue;
      params.push({
        key,
        value: rawValue, // true percent-encoded raw value
        decodedValue, // already decoded by URLSearchParams
      });
    });

    return {
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      hash: parsed.hash,
      params,
    };
  } catch {
    return null;
  }
}

/**
 * Attempts to parse a string as JSON and returns a pretty-printed version.
 * Returns the original string if it is not valid JSON.
 */
export function tryFormatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}
