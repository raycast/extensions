import { getPreferenceValues } from "@raycast/api";

const API_BASE_URL = "https://api.geekflare.com";
const TIMEOUT_MS = 180_000;

export const WEBSITE_CHECKS = {
  site_status: { path: "up", title: "Site Status" },
  dns_records: { path: "dnsrecord", title: "DNS Records" },
  tls_scan: { path: "tlsscan", title: "TLS / SSL Scan" },
  redirect_check: { path: "redirectcheck", title: "Redirect Chain" },
  broken_links: { path: "brokenlink", title: "Broken Links" },
  load_time: { path: "loadtime", title: "Load Time" },
  lighthouse: { path: "lighthouse", title: "Lighthouse Audit" },
} as const;

export type WebsiteCheck = keyof typeof WEBSITE_CHECKS;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position?: number;
}

export class GeekflareError extends Error {}

/** Accept bare domains such as `example.com` by adding `https://`. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed && !/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

/** POST a JSON body to a Geekflare endpoint and return the parsed response. */
export async function callGeekflare<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const payload = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== ""));
  const timeout = AbortSignal.timeout(TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", "User-Agent": "geekflare-raycast" },
      body: JSON.stringify(payload),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    throw new GeekflareError(`Request to Geekflare failed: ${(error as Error).message}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GeekflareError(`Geekflare returned a malformed response (HTTP ${response.status}).`);
  }
  const record = (data && typeof data === "object" ? data : { data }) as Record<string, unknown>;
  if (!response.ok || record.apiStatus === "failure") {
    const message = typeof record.message === "string" ? record.message : response.statusText || "request failed";
    throw new GeekflareError(`Geekflare API error ${response.status}: ${message}`);
  }
  return record as T;
}

/** Normalize standard search results and SERP organic results into one shape. */
export function toSearchResults(payload: Record<string, unknown>): SearchResult[] {
  const data = payload.data;
  const items = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { organic?: unknown }).organic)
      ? ((data as { organic: unknown[] }).organic as unknown[])
      : [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      title: String(item.title ?? ""),
      url: String(item.url ?? item.link ?? ""),
      snippet: String(item.snippet ?? item.description ?? ""),
      position: typeof item.position === "number" ? item.position : undefined,
    }))
    .filter((result) => result.url);
}

/** Pull page text out of a scrape response, which may be a string or an object keyed by format. */
export function toScrapedText(payload: Record<string, unknown>): string {
  const content = payload.data;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    for (const key of ["markdown", "markdown-llm", "text"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return "";
}
