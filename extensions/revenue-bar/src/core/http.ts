import { z } from "zod";
import { ErrorSource, ProviderError, ProviderErrorKind } from "./errors";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type HttpRequest<T> = {
  source: ErrorSource;
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  schema: z.ZodType<T>;
  /** Pulls a human-readable message out of an error body. */
  errorMessage?: (body: unknown) => string | undefined;
};

export type HttpOptions = {
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

/** A function that performs one typed request. Provider clients receive one of these, so tests can replace it. */
export type Http = <T>(request: HttpRequest<T>) => Promise<T>;

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_RETRIES = 3;

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export function createHttp(options: HttpOptions = {}): Http {
  return (request) => http(request, options);
}

export async function http<T>(request: HttpRequest<T>, options: HttpOptions = {}): Promise<T> {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 30_000;

  let lastError: ProviderError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(request.url, {
        method: request.method ?? "GET",
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      const timedOut = controller.signal.aborted;
      lastError = new ProviderError(
        request.source,
        "network",
        timedOut ? `Request timed out after ${Math.round(timeoutMs / 1000)}s` : networkMessage(error),
      );
      if (attempt < retries) {
        await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs, random));
        continue;
      }
      throw lastError;
    }
    clearTimeout(timer);

    if (response.ok) {
      const body = await readJson(response, request.source);
      const parsed = request.schema.safeParse(body);
      if (!parsed.success) {
        throw new ProviderError(request.source, "schema", describeSchemaError(parsed.error), {
          status: response.status,
        });
      }
      return parsed.data;
    }

    const errorBody = await readJson(response, request.source).catch(() => undefined);
    const apiMessage = request.errorMessage?.(errorBody);
    lastError = new ProviderError(
      request.source,
      kindForStatus(response.status),
      apiMessage ? `${apiMessage} (HTTP ${response.status})` : `HTTP ${response.status}`,
      { status: response.status },
    );

    if (attempt < retries && RETRYABLE_STATUS.has(response.status)) {
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"), now());
      // A server asking us to wait longer than we are willing to block the UI for is reported, not slept through.
      if (retryAfter !== undefined && retryAfter > maxDelayMs) throw lastError;
      await sleep(retryAfter ?? backoffDelay(attempt, baseDelayMs, maxDelayMs, random));
      continue;
    }
    throw lastError;
  }

  // Unreachable: the loop either returns or throws.
  throw lastError ?? new ProviderError(request.source, "unknown", "Request failed");
}

export function kindForStatus(status: number): ProviderErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500 || status === 408) return "network";
  return "unknown";
}

/** Exponential backoff with full jitter: random(0, min(max, base * 2^attempt)). */
export function backoffDelay(attempt: number, baseMs: number, maxMs: number, random: () => number): number {
  const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.round(random() * ceiling);
}

/** Retry-After is either delta-seconds or an HTTP-date. Returns milliseconds to wait, or undefined. */
export function parseRetryAfter(value: string | null, nowMs: number): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(Number(trimmed) * 1000);
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - nowMs);
}

async function readJson(response: Response, source: ErrorSource): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(source, "schema", `Expected JSON but got ${text.slice(0, 40).replace(/\s+/g, " ")}…`, {
      status: response.status,
    });
  }
}

function describeSchemaError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Response did not match the expected shape";
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `Response did not match the expected shape at ${path}: ${issue.message}`;
}

function networkMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: { code?: string } }).cause;
    return cause?.code ? `${error.message} (${cause.code})` : error.message;
  }
  return "Network request failed";
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Builds a query string, skipping undefined values and keeping bracketed keys readable (filter[x], created[gte]). */
export function buildQuery(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      parts.push(`${encodeKey(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function encodeKey(key: string): string {
  return encodeURIComponent(key).replace(/%5B/g, "[").replace(/%5D/g, "]");
}
