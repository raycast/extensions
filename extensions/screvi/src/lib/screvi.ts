import { getPreferenceValues } from "@raycast/api";

/**
 * Thin binding to the Screvi public API (https://screvi.com/docs/api/public-api).
 * Every endpoint is key-authenticated, subscription-gated, and capped at
 * 100 requests/minute per key, so the views below page rather than prefetch.
 */

export type SourceType =
  "book" | "article" | "tweet" | "self" | "podcast" | "video" | "custom" | "youtube" | "pdf" | "author" | "topics";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface TagWithCounts extends Tag {
  highlight_count: number;
  article_count: number;
}

export interface HighlightSource {
  id: string;
  name: string;
  type: SourceType;
  author: string | null;
  image_url: string | null;
  url: string | null;
}

export interface Highlight {
  id: string;
  content: string;
  note: string | null;
  favorite: boolean;
  url: string | null;
  location: number | null;
  date: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  source: HighlightSource | null;
}

export interface SearchResult extends Highlight {
  similarity: number | null;
  match_type: "semantic" | "keyword" | "both";
  relevance: number;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  author: string | null;
  image_url: string | null;
  url: string | null;
  origin: string | null;
  note: string | null;
  tags: Tag[];
  highlight_count: number;
  created_at: string;
}

export interface Article {
  id: string;
  title: string | null;
  author: string | null;
  url: string;
  canonical_url: string | null;
  excerpt: string | null;
  status: "unread" | "reading" | "read" | "archived";
  home_status: "inbox" | "later" | "archive";
  favorite: boolean;
  progress_percentage: number;
  reading_time_minutes: number | null;
  word_count: number | null;
  source_domain: string | null;
  site_name: string | null;
  saved_at: string;
  published_date: string | null;
  updated_at: string;
  parse_state: "queued" | "fetching" | "parsed" | "failed";
  note: string | null;
  image_url: string | null;
  /** Absolute link to the article in the web app, supplied by the API. */
  screvi_url: string;
  highlight_count: number;
  tags: Tag[];
}

export interface SavedArticle {
  id: string;
  url: string;
  parse_state: "queued" | "fetching" | "parsed" | "failed";
  tags: Tag[];
  duplicate?: boolean;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

// `Preferences` is generated from package.json into raycast-env.d.ts.
function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Base for every call, with a trailing slash and any accidental `/api/v1` trimmed. */
export function apiBase(): string {
  const raw = preferences().apiUrl?.trim() || "https://api.screvi.com";
  return `${raw.replace(/\/+$/, "").replace(/\/api\/v1$/, "")}/api/v1`;
}

export function headers(): Record<string, string> {
  return {
    "X-API-Key": preferences().apiKey,
    Accept: "application/json",
  };
}

/** Build `${base}/path?a=1`, dropping params that are undefined, null or "". */
export function endpoint(path: string, params: Record<string, string | number | boolean | undefined | null> = {}) {
  const url = new URL(`${apiBase()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** A failed API call, carrying the server's own message where it gave one. */
export class ScreviError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ScreviError";
  }
}

/**
 * Turn the API's error envelope into something worth showing in a toast.
 * The three statuses users actually hit are a bad key, a lapsed subscription,
 * and the per-key rate limit; everything else falls back to the server text.
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;

  let detail = "";
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
      fields?: Record<string, string>;
    };
    // A 422 carries the useful part in `fields` ("url: DNS resolution failed"),
    // while `error` is only ever the generic "Validation failed".
    const fields = body.fields
      ? Object.entries(body.fields)
          .map(([field, problem]) => `${field}: ${problem}`)
          .join(", ")
      : "";
    detail = fields || body.message || body.error || "";
  } catch {
    // Non-JSON error body (a proxy or gateway page); the status carries the meaning.
  }

  switch (response.status) {
    case 401:
      throw new ScreviError("Invalid API key. Create one in Screvi under Settings > API.", 401);
    case 403:
      throw new ScreviError(detail || "This needs an active Screvi subscription.", 403);
    case 429:
      throw new ScreviError("Rate limited by Screvi. Wait a minute and try again.", 429);
    default:
      throw new ScreviError(detail || `Screvi returned ${response.status}.`, response.status);
  }
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function get<T>(url: string): Promise<T> {
  return parseResponse<T>(await fetch(url, { headers: headers() }));
}

/**
 * Where the web app lives for the configured server. Screvi serves the API at
 * `api.<domain>` and the app at `app.<domain>`, so a self-hosted `apiUrl` has to
 * move the deep links with it — otherwise they all point at the hosted app.
 */
export function appBase(): string {
  const raw = preferences().apiUrl?.trim();
  if (!raw) return "https://app.screvi.com";
  try {
    const url = new URL(raw);
    url.hostname = url.hostname.replace(/^api\./, "app.");
    url.pathname = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "https://app.screvi.com";
  }
}

/** Where an item lives in the web app. */
export function highlightUrl(id: string) {
  return `${appBase()}/highlights/${id}`;
}

export function sourceUrl(id: string) {
  return `${appBase()}/sources/${id}`;
}

export function articleUrl(id: string) {
  return `${appBase()}/articles/${id}`;
}
