import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://api.t.ly/api/v1/link/shorten";

export interface ShortenOptions {
  longUrl: string;
  domain?: string;
  description?: string;
}

export interface ShortLinkResponse {
  short_url: string;
  short_id?: string;
  long_url?: string;
  domain?: string;
  description?: string | null;
}

function optional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function responseError(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data.trim();

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }

  return `T.LY returned an error (${status}).`;
}

export function validateUrl(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("Enter a URL to shorten.");

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Enter a valid absolute URL, including https://.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("T.LY can only shorten HTTP and HTTPS URLs.");
  }

  return url.toString();
}

export async function shortenUrl(
  options: ShortenOptions,
): Promise<ShortLinkResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const longUrl = validateUrl(options.longUrl);
  const body = {
    long_url: longUrl,
    domain: optional(options.domain) ?? optional(preferences.defaultDomain),
    description: optional(options.description),
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${preferences.apiToken}`,
      "Content-Type": "application/json",
      "User-Agent": "tly-raycast-extension/1.0",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: unknown = raw;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      // Keep the raw response when the API returns non-JSON text.
    }
  }

  if (!response.ok) throw new Error(responseError(data, response.status));

  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as Record<string, unknown>).short_url !== "string"
  ) {
    throw new Error("T.LY did not return a short URL.");
  }

  return data as ShortLinkResponse;
}
