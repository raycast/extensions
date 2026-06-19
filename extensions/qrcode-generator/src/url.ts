export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/** True for absolute http(s) URLs — UTM/shortening only make sense for these. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Append non-empty UTM parameters to an http(s) URL.
 * Non-URL content (plain text) is returned unchanged.
 */
export function appendUtmParams(value: string, params: UtmParams): string {
  if (!isHttpUrl(value)) {
    return value;
  }

  const url = new URL(value.trim());
  const mapping: [string, string | undefined][] = [
    ["utm_source", params.source],
    ["utm_medium", params.medium],
    ["utm_campaign", params.campaign],
    ["utm_term", params.term],
    ["utm_content", params.content],
  ];

  for (const [key, raw] of mapping) {
    const trimmed = raw?.trim();
    if (trimmed) {
      url.searchParams.set(key, trimmed);
    }
  }

  return url.toString();
}

/** URL shorteners that need no API key. Tried in order; first success wins.
 *  is.gd and da.gd do direct 301 redirects; TinyURL may show an interstitial, so it's last. */
const SHORTENERS: { name: string; build: (url: string) => string }[] = [
  { name: "is.gd", build: (u) => `https://is.gd/create.php?format=simple&url=${encodeURIComponent(u)}` },
  { name: "da.gd", build: (u) => `https://da.gd/shorten?url=${encodeURIComponent(u)}` },
  { name: "TinyURL", build: (u) => `https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}` },
];

async function requestShort(endpoint: string): Promise<string> {
  // Bound the request with AbortController (broadly supported) so a slow service can't hang the submit.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    const body = (await response.text()).trim();
    if (!response.ok || body.toLowerCase().startsWith("error")) {
      throw new Error(body || `status ${response.status}`);
    }
    if (!isHttpUrl(body)) {
      throw new Error(`unexpected response: ${body.slice(0, 80)}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Shorten a URL via a no-key service (is.gd, then da.gd, then TinyURL).
 * Throws with the collected provider errors if all fail.
 */
export async function shortenUrl(value: string): Promise<string> {
  const errors: string[] = [];
  for (const { name, build } of SHORTENERS) {
    try {
      return await requestShort(build(value));
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Could not shorten link (${errors.join("; ")})`);
}
