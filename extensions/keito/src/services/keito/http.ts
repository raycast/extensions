import { KEITO_API_BASE_URL } from "./config";
import { errorFromResponse, KeitoError } from "./errors";
import { RawPaginationEnvelope } from "./types";

export interface FetchResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<FetchResponseLike>;

export type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

/** Supplies auth headers for each request. Headers never appear in errors or logs. */
export interface KeitoAuthProvider {
  kind: "api_key" | "oauth";
  headers(): Promise<Record<string, string>>;
  /** Called once after a 401. Return true to retry with fresh headers (e.g. after a token refresh). */
  onUnauthorized?(): Promise<boolean>;
}

/** API key auth: Bearer kto_… key plus the Company ID header. */
export function apiKeyAuth(token: string, accountId: string): KeitoAuthProvider {
  return {
    kind: "api_key",
    headers: async () => ({ Authorization: `Bearer ${token}`, "Keito-Account-Id": accountId }),
  };
}

export interface KeitoHttpOptions {
  /** Either an auth provider, or an API key and Company ID. */
  auth?: KeitoAuthProvider;
  token?: string;
  accountId?: string;
  baseUrl?: string;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  /** Retries after the first attempt for retryable failures. */
  maxRetries?: number;
  /** Longest Retry-After the client will wait before giving up with a rate-limit error. */
  maxRetryWaitSeconds?: number;
  timeoutMs?: number;
  maxPages?: number;
  perPage?: number;
  onRateLimited?: (waitSeconds: number) => void;
}

export interface KeitoResponse<T> {
  data: T;
  status: number;
  features: string[];
}

const USER_AGENT = "Keito Raycast Extension";

function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - now) / 1000));
  return undefined;
}

export function parseFeatures(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export class KeitoHttpClient {
  private readonly base: URL;
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly options: Required<
    Pick<KeitoHttpOptions, "maxRetries" | "maxRetryWaitSeconds" | "timeoutMs" | "maxPages" | "perPage">
  >;

  private readonly auth: KeitoAuthProvider;

  constructor(private readonly config: KeitoHttpOptions) {
    if (config.auth) this.auth = config.auth;
    else if (config.token && config.accountId) this.auth = apiKeyAuth(config.token, config.accountId);
    else throw new KeitoError("missing_credentials", "No Keito credentials were configured.");
    this.base = new URL((config.baseUrl ?? KEITO_API_BASE_URL).replace(/\/+$/, ""));
    this.fetchImpl = config.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.sleep = config.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.options = {
      maxRetries: config.maxRetries ?? 2,
      maxRetryWaitSeconds: config.maxRetryWaitSeconds ?? 30,
      timeoutMs: config.timeoutMs ?? 30000,
      maxPages: config.maxPages ?? 50,
      perPage: config.perPage ?? 100,
    };
  }

  /**
   * Resolve a link returned by Keito (e.g. links.next). Links may be relative ("/api/v2/…?page=2")
   * or absolute, and are resolved with standard URL rules. The result must stay on the configured
   * API origin and path, so the credentials are never sent elsewhere.
   */
  resolveLink(link: string): URL {
    const basePath = this.base.pathname.replace(/\/+$/, "");
    const url = new URL(link, `${this.base.origin}${basePath}/`);
    if (url.origin !== this.base.origin || !url.pathname.startsWith(`${basePath}/`)) {
      throw new KeitoError(
        "unexpected_response",
        "Keito returned a link outside the configured API address; the request was not sent.",
      );
    }
    return url;
  }

  /** Resolve an endpoint path such as "/time_entries" (or a full link) and apply query values. */
  resolveUrl(pathOrUrl: string, query?: Query): URL {
    const basePath = this.base.pathname.replace(/\/+$/, "");
    const url = /^https?:\/\//i.test(pathOrUrl)
      ? this.resolveLink(pathOrUrl)
      : this.resolveLink(`${basePath}/${pathOrUrl.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url;
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    pathOrUrl: string,
    { query, body }: { query?: Query; body?: unknown } = {},
  ): Promise<KeitoResponse<T>> {
    const url = this.resolveUrl(pathOrUrl, query).toString();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const buildHeaders = async () => {
      const headers: Record<string, string> = {
        ...(await this.auth.headers()),
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      };
      if (payload !== undefined) headers["Content-Type"] = "application/json";
      return headers;
    };
    let headers = await buildHeaders();
    let reauthorized = false;

    // Writes are retried only for 429, which Keito rejects before processing. Retrying a write after
    // a 5xx or a dropped connection could create a duplicate entry.
    const idempotent = method === "GET";

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.options.maxRetries;
      let response: FetchResponseLike;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
      // The timeout covers the response body too: a server can send headers and then stall.
      let raw: string;
      try {
        response = await this.fetchImpl(url, { method, headers, body: payload, signal: controller.signal });
        raw = await response.text();
      } catch {
        const timedOut = controller.signal.aborted;
        if (idempotent && canRetry) {
          await this.sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new KeitoError(
          timedOut ? "timeout" : "network",
          timedOut
            ? "Keito did not respond in time. Check your connection and try again."
            : "Could not reach Keito. Check your internet connection and try again.",
        );
      } finally {
        clearTimeout(timer);
      }

      let data: unknown = undefined;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = undefined;
        }
      }

      if (response.status >= 200 && response.status < 300) {
        if (raw && data === undefined) {
          throw new KeitoError("unexpected_response", "Keito returned a response that is not JSON.", {
            status: response.status,
          });
        }
        return {
          data: data as T,
          status: response.status,
          features: parseFeatures(response.headers.get("x-keito-features")),
        };
      }

      // A 401 is rejected before processing, so one retry after refreshing the token is safe,
      // including for writes.
      if (response.status === 401 && !reauthorized && this.auth.onUnauthorized) {
        reauthorized = true;
        if (await this.auth.onUnauthorized()) {
          headers = await buildHeaders();
          attempt--;
          continue;
        }
      }
      if (response.status === 401 && this.auth.kind === "oauth") {
        throw new KeitoError("signed_out", "Your Keito sign-in has expired or was revoked. Sign in again.", {
          status: 401,
        });
      }

      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      if (response.status === 429 && canRetry) {
        const wait = retryAfter ?? 2 ** attempt;
        if (wait <= this.options.maxRetryWaitSeconds) {
          this.config.onRateLimited?.(wait);
          await this.sleep(wait * 1000);
          continue;
        }
      }
      if (response.status >= 500 && idempotent && canRetry) {
        await this.sleep(1000 * 2 ** attempt);
        continue;
      }
      throw errorFromResponse(response.status, data, retryAfter);
    }
  }

  /** Fetch every page of a collection, following links.next on the API origin. */
  async paginate<T>(path: string, key: string, query: Query = {}): Promise<T[]> {
    const items: T[] = [];
    const seen = new Set<string>();
    let next: string | null = this.resolveUrl(path, { per_page: this.options.perPage, ...query }).toString();

    for (let page = 0; next; page++) {
      if (page >= this.options.maxPages) {
        throw new KeitoError(
          "unexpected_response",
          `Stopped after ${this.options.maxPages} pages of ${key}; narrow the request and try again.`,
        );
      }
      if (seen.has(next)) {
        throw new KeitoError("unexpected_response", `Keito returned a repeating page link for ${key}.`);
      }
      seen.add(next);

      const response: KeitoResponse<RawPaginationEnvelope & Record<string, unknown>> = await this.request("GET", next);
      const data = response.data;
      const pageItems = data?.[key];
      if (!Array.isArray(pageItems)) {
        throw new KeitoError("unexpected_response", `Keito's response did not include a ${key} list.`);
      }
      items.push(...(pageItems as T[]));

      const link: string | null | undefined = data.links?.next;
      if (link) {
        next = this.resolveLink(link).toString();
      } else if (data.links === undefined && data.page && data.total_pages && data.page < data.total_pages) {
        // Fallback for envelopes without links: advance the page number on the same URL.
        const url: URL = new URL(next);
        url.searchParams.set("page", String(data.page + 1));
        next = url.toString();
      } else {
        next = null;
      }
    }
    return items;
  }
}
