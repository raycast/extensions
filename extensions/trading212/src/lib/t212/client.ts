import { sleep as realSleep } from "../sleep";
import type { AccountSummary, Environment, Page, Position } from "./types";

export const BASE_URLS: Record<Environment, string> = {
  live: "https://live.trading212.com",
  demo: "https://demo.trading212.com",
};

export type HistoryPath =
  "/api/v0/equity/history/dividends" | "/api/v0/equity/history/orders" | "/api/v0/equity/history/transactions";

export type T212ErrorKind = "unauthorized" | "forbidden" | "rateLimited" | "network" | "http";

export class T212Error extends Error {
  kind: T212ErrorKind;
  status?: number;
  retryAfterMs?: number;

  constructor(kind: T212ErrorKind, message: string, extra: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = "T212Error";
    this.kind = kind;
    this.status = extra.status;
    this.retryAfterMs = extra.retryAfterMs;
  }
}

/**
 * A plain 4xx: Trading 212 refused the request itself (e.g. an expired page cursor), so retrying won't help.
 * Not a 408 timeout, which is transient.
 */
export function isRejectedCursorError(err: unknown): boolean {
  if (!(err instanceof T212Error) || err.kind !== "http") return false;
  const status = err.status ?? 0;
  return status >= 400 && status < 500 && status !== 408;
}

/** The permission a 403 names ("Scope( history:dividends ) missing for API key"), or null. */
export function missingScope(err: unknown): string | null {
  if (!(err instanceof T212Error) || err.kind !== "forbidden") return null;
  return /Scope\(\s*([^)\s]+)\s*\)\s*missing/i.exec(err.message)?.[1] ?? null;
}

export function isRateLimited(err: unknown): err is T212Error {
  return err instanceof T212Error && err.kind === "rateLimited";
}

const MAX_SYNC_RETRY_WAIT_MS = 60_000;

/** How long a history sync waits before retrying a rate-limited page (at most a minute); null when `err` isn't a 429. */
export function rateLimitWaitMs(err: unknown): number | null {
  if (!isRateLimited(err)) return null;
  return Math.min(err.retryAfterMs ?? MAX_SYNC_RETRY_WAIT_MS, MAX_SYNC_RETRY_WAIT_MS);
}

export interface T212Client {
  getAccountSummary(): Promise<AccountSummary>;
  getPositions(): Promise<Position[]>;
  getHistoryPage<T>(path: HistoryPath, next: string | null): Promise<Page<T>>;
}

const HISTORY_PAGE_LIMIT = 50;
/** A 429 is retried once in place when the limit resets within this window. */
const MAX_INLINE_RETRY_WAIT_MS = 6000;
/** Wait before the retry when a 429 has no reset header (the tightest limit is 1 request per 5 s). */
const DEFAULT_RETRY_WAIT_MS = 5000;

function retryAfterMs(res: Response): number | undefined {
  const header = res.headers.get("x-ratelimit-reset");
  const reset = Number(header);
  if (!header || !Number.isFinite(reset)) return undefined;
  return Math.max(0, reset * 1000 - Date.now());
}

export function createT212Client(opts: {
  apiKey: string;
  apiSecret: string;
  environment: Environment;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): T212Client {
  const baseUrl = BASE_URLS[opts.environment];
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? realSleep;
  const authorization = "Basic " + Buffer.from(`${opts.apiKey}:${opts.apiSecret}`).toString("base64");

  async function get<R>(pathOrNext: string): Promise<R> {
    try {
      return await getOnce<R>(pathOrNext);
    } catch (err) {
      if (!isRateLimited(err)) throw err;
      const wait = err.retryAfterMs ?? DEFAULT_RETRY_WAIT_MS;
      if (wait > MAX_INLINE_RETRY_WAIT_MS) throw err;
      await sleep(wait);
      return getOnce<R>(pathOrNext);
    }
  }

  async function getOnce<R>(pathOrNext: string): Promise<R> {
    let res: Response;
    try {
      res = await fetchFn(baseUrl + pathOrNext, { method: "GET", headers: { Authorization: authorization } });
    } catch (e) {
      throw new T212Error("network", e instanceof Error ? e.message : "Network error");
    }
    if (res.ok) return (await res.json()) as R;

    const body = await res.text().catch(() => "");
    const message = body || `HTTP ${res.status}`;
    const status = res.status;
    if (status === 401) throw new T212Error("unauthorized", message, { status });
    if (status === 403) throw new T212Error("forbidden", message, { status });
    if (status === 429) throw new T212Error("rateLimited", message, { status, retryAfterMs: retryAfterMs(res) });
    throw new T212Error("http", message, { status });
  }

  return {
    getAccountSummary: () => get<AccountSummary>("/api/v0/equity/account/summary"),
    getPositions: () => get<Position[]>("/api/v0/equity/positions"),
    async getHistoryPage<T>(path: HistoryPath, next: string | null): Promise<Page<T>> {
      const raw = await get<{ items?: T[]; nextPagePath?: string | null }>(
        next ?? `${path}?limit=${HISTORY_PAGE_LIMIT}`,
      );
      // An empty page would read as "end of history"; a malformed one must not.
      if (!Array.isArray(raw.items)) throw new T212Error("http", "Unexpected history response from Trading 212");
      return { items: raw.items, nextPagePath: raw.nextPagePath ?? null };
    },
  };
}
