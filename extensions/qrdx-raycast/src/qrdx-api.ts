// The QRdx REST API (https://qrdx.dev/docs/developers/rest-api), for the
// dynamic codes of the workspace an API key belongs to. Nothing here reads
// Raycast's preferences: the key is passed in (./api-key reads it), so
// apps/app/tests/plugins can run these functions with a fake fetch.

import type { CodeStyle } from "./code-style";

export const API_URL = "https://api.qrdx.dev/v1";
/** Settings → API keys & apps, with the Create API key form open. */
export const CREATE_API_KEY_URL = "https://qrdx.dev/dashboard?to=settings/developers&new=1";
export const API_KEYS_DOCS_URL = "https://qrdx.dev/docs/developers/api-keys";

/** A dynamic code as GET /v1/codes returns it (the fields this extension reads). */
export interface DynamicCode {
  id: string;
  slug: string;
  /** What the code encodes: on the code's custom domain once it's verified */
  shortLink: string;
  /** Where a website-link code sends people; null for a hosted page */
  destinationUrl: string | null;
  title: string | null;
  /** `redirect` opens `destinationUrl`; `page` opens a hosted page */
  kind: "redirect" | "page";
  /** `archived` codes don't redirect; `disabled` ones are over the plan's limit */
  status: "active" | "archived" | "disabled";
  style: CodeStyle | null;
  scanCount: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CountRow {
  value: string | null;
  count: number;
}

/** GET /v1/codes/{id}/scans, without the individual scans. */
export interface ScanAnalytics {
  codeId: string;
  range: string;
  /** Days of history the plan keeps; null when it keeps all of it */
  retentionDays: number | null;
  from: string;
  days: number;
  total: number;
  unique: number;
  interval: "day" | "week" | "month";
  series: { date: string; count: number }[];
  countries: CountRow[];
  cities: { city: string | null; country: string | null; count: number }[];
  devices: CountRow[];
  os: CountRow[];
  browsers: CountRow[];
  referrers: CountRow[];
}

/** The ranges GET /v1/codes/{id}/scans takes, shortest first. */
export const SCAN_RANGES = ["7d", "30d", "90d", "365d", "all"] as const;
export type ScanRange = (typeof SCAN_RANGES)[number];

/** An error the API answered with: its HTTP status, code and message. */
export class QRdxApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "QRdxApiError";
    this.status = status;
    this.code = code;
  }
}

/** The API's error body: `{ code, message, status, docs }`. */
function errorFrom(status: number, body: unknown): QRdxApiError {
  const fields = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof fields.code === "string" ? fields.code : undefined;
  const message =
    typeof fields.message === "string" && fields.message
      ? fields.message
      : `QRdx answered with HTTP ${status}. Try again in a moment.`;
  if (status === 401) {
    return new QRdxApiError(status, code, `${message} The key is in this extension's preferences.`);
  }
  return new QRdxApiError(status, code, message);
}

const UNREADABLE = "QRdx sent an answer this extension can't read.";

/** The response body of a call, `{ data, … }`; an error status throws. */
async function call(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown },
  fetchImpl: typeof fetch = fetch
): Promise<{ data: unknown; pagination?: { total?: number } }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetchImpl(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFrom(response.status, body);
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new QRdxApiError(response.status, undefined, UNREADABLE);
  }
  return body as { data: unknown; pagination?: { total?: number } };
}

async function request<T>(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
  fetchImpl?: typeof fetch
): Promise<T> {
  return (await call(apiKey, path, init, fetchImpl)).data as T;
}

/**
 * Up to 100 active codes, newest first. `query` searches their titles,
 * destinations, notes and tags, and finds a code by its short link.
 */
export async function listCodes(
  apiKey: string,
  query?: string,
  fetchImpl?: typeof fetch
): Promise<{ codes: DynamicCode[]; total: number }> {
  const params = new URLSearchParams({ status: "active", limit: "100" });
  if (query?.trim()) params.set("q", query.trim().slice(0, 200));
  const { data, pagination } = await call(apiKey, `/codes?${params}`, {}, fetchImpl);
  if (!Array.isArray(data)) throw new QRdxApiError(200, undefined, UNREADABLE);
  return { codes: data as DynamicCode[], total: pagination?.total ?? data.length };
}

export function getCode(apiKey: string, id: string, fetchImpl?: typeof fetch): Promise<DynamicCode> {
  return request<DynamicCode>(apiKey, `/codes/${encodeURIComponent(id)}`, {}, fetchImpl);
}

/**
 * A new dynamic code for `destinationUrl`. Without a style it gets the
 * workspace's default design, as codes made in QRdx do.
 */
export function createCode(
  apiKey: string,
  input: { destinationUrl: string; title?: string },
  fetchImpl?: typeof fetch
): Promise<DynamicCode> {
  const title = input.title?.trim();
  return request<DynamicCode>(
    apiKey,
    "/codes",
    {
      method: "POST",
      body: { destinationUrl: input.destinationUrl.trim(), ...(title ? { title } : {}) },
    },
    fetchImpl
  );
}

/** Changes where a code sends people and/or its title; its link stays. */
export function updateCode(
  apiKey: string,
  id: string,
  fields: { destinationUrl?: string; title?: string },
  fetchImpl?: typeof fetch
): Promise<DynamicCode> {
  return request<DynamicCode>(apiKey, `/codes/${encodeURIComponent(id)}`, { method: "PATCH", body: fields }, fetchImpl);
}

export function getScans(
  apiKey: string,
  id: string,
  range: ScanRange = "30d",
  fetchImpl?: typeof fetch
): Promise<ScanAnalytics> {
  const params = new URLSearchParams({ range });
  return request<ScanAnalytics>(apiKey, `/codes/${encodeURIComponent(id)}/scans?${params}`, {}, fetchImpl);
}

/** The code's page in the QRdx dashboard, in the workspace last opened there. */
export function dashboardLink(id: string): string {
  return `https://qrdx.dev/dashboard?to=codes/${encodeURIComponent(id)}`;
}

/** A code's name: its title, else its link without the scheme. */
export function codeName(code: Pick<DynamicCode, "title" | "shortLink">): string {
  return code.title?.trim() || code.shortLink.replace(/^https?:\/\//, "");
}

/** The longest destination the API takes, as the playground link's limit. */
const MAX_DESTINATION_LENGTH = 2048;

/**
 * An error message for a destination, or undefined when it's usable: an
 * http(s) address. The API checks it again (and screens it for malware).
 */
export function destinationError(value: string): string | undefined {
  const text = value.trim();
  if (!text) return "Enter the address the code should open";
  if (text.length > MAX_DESTINATION_LENGTH) return "The address is too long";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Enter a full address, starting with https://";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "The address must start with https:// or http://";
  }
  if (!url.hostname) return "Enter a full address, starting with https://";
  return undefined;
}
