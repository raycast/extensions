import { Toast, openExtensionPreferences, showToast } from "@raycast/api";

export class MakeApiError extends Error {
  status: number;
  url: string;
  bodyText?: string;
  retryAfterMs?: number;

  constructor(opts: {
    message: string;
    status: number;
    url: string;
    bodyText?: string;
    retryAfterMs?: number;
  }) {
    super(opts.message);
    this.name = "MakeApiError";
    this.status = opts.status;
    this.url = opts.url;
    this.bodyText = opts.bodyText;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  return `https://${trimmed}`;
}

function normalizeAuthorizationHeaderValue(input: string): string {
  const token = input.trim();
  if (!token) return token;
  if (/^token\s+/i.test(token)) return token;
  if (/^bearer\s+/i.test(token)) return token;
  return `Token ${token}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

class RateLimiter {
  private minIntervalMs: number;
  private nextAtMs = 0;

  constructor(perMinute: number) {
    const safe = Math.max(1, Math.floor(perMinute));
    this.minIntervalMs = Math.ceil(60_000 / safe);
  }

  setPerMinute(perMinute: number) {
    const safe = Math.max(1, Math.floor(perMinute));
    this.minIntervalMs = Math.ceil(60_000 / safe);
  }

  async waitTurn() {
    const now = Date.now();
    const waitMs = Math.max(0, this.nextAtMs - now);
    if (waitMs > 0) await sleep(waitMs);
    this.nextAtMs = Math.max(this.nextAtMs, now) + this.minIntervalMs;
  }
}

type MakeClientOpts = {
  baseUrl: string;
  apiToken: string;
};

type QueryValue = string | number | boolean;
type QueryParam = QueryValue | QueryValue[] | undefined | null;

export class MakeClient {
  private baseUrl: string;
  private authorization: string;
  private rateLimiter: RateLimiter | null = null;
  private timeoutMs = 20_000;

  constructor(opts: MakeClientOpts) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.authorization = normalizeAuthorizationHeaderValue(opts.apiToken);
  }

  setTimeoutMs(timeoutMs: number) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return;
    this.timeoutMs = Math.max(1000, Math.floor(timeoutMs));
  }

  setRateLimitPerMinute(perMinute: number) {
    if (!Number.isFinite(perMinute) || perMinute <= 0) return;
    if (!this.rateLimiter) this.rateLimiter = new RateLimiter(perMinute);
    else this.rateLimiter.setPerMinute(perMinute);
  }

  url(path: string, query?: Record<string, QueryParam>): string {
    const full = new URL(
      path.startsWith("/")
        ? `${this.baseUrl}${path}`
        : `${this.baseUrl}/${path}`,
    );

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) full.searchParams.append(k, String(item));
          continue;
        }
        full.searchParams.set(k, String(v));
      }
    }

    return full.toString();
  }

  async getJson<T>(
    path: string,
    query?: Record<string, QueryParam>,
  ): Promise<T> {
    return await this.requestJson<T>("GET", path, { query });
  }

  async postJson<T>(
    path: string,
    opts?: {
      query?: Record<string, QueryParam>;
      body?: unknown;
    },
  ): Promise<T> {
    return await this.requestJson<T>("POST", path, {
      query: opts?.query,
      body: opts?.body,
    });
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    path: string,
    opts?: {
      query?: Record<string, QueryParam>;
      body?: unknown;
    },
  ): Promise<T> {
    const url = this.url(path, opts?.query);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.rateLimiter) await this.rateLimiter.waitTurn();

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: {
            Authorization: this.authorization,
            Accept: "application/json",
            ...(opts?.body ? { "Content-Type": "application/json" } : null),
          },
          body: opts?.body ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
      } catch (e) {
        if (
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError")
        ) {
          throw new MakeApiError({
            message: `Request timed out (${method} ${path})`,
            status: 408,
            url,
          });
        }
        throw e;
      } finally {
        clearTimeout(t);
      }

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfterMs =
          parseRetryAfterMs(res.headers.get("Retry-After")) ??
          // fallback: jittered exponential backoff
          250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
        await sleep(retryAfterMs);
        continue;
      }

      if (!res.ok) {
        const bodyText = await res.text().catch(() => undefined);
        const retryAfterMs = parseRetryAfterMs(res.headers.get("Retry-After"));
        const message = `Make API error ${res.status} (${method} ${path})`;
        throw new MakeApiError({
          message,
          status: res.status,
          url,
          bodyText,
          retryAfterMs: retryAfterMs ?? undefined,
        });
      }

      // Make API responses are JSON; if not, this will throw and bubble.
      return (await res.json()) as T;
    }

    // Unreachable
    throw new MakeApiError({
      message: `Make API error (exhausted retries) (${method} ${path})`,
      status: 429,
      url,
    });
  }
}

export async function presentMakeApiError(
  err: unknown,
  fallbackTitle = "Request failed",
) {
  const message = err instanceof Error ? err.message : String(err);

  if (err instanceof MakeApiError && err.status === 408) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Request timed out",
      message: "Please try again.",
    });
    return;
  }

  if (
    err instanceof MakeApiError &&
    (err.status === 401 || err.status === 403)
  ) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Make API auth failed",
      message: "Check your API token + scopes in extension preferences.",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: openExtensionPreferences,
      },
    });
    return;
  }

  if (err instanceof MakeApiError && err.status === 429) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Make API rate limit hit",
      message:
        err.retryAfterMs && err.retryAfterMs > 0
          ? `Retry after ~${Math.ceil(err.retryAfterMs / 1000)}s`
          : "Please try again shortly.",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: fallbackTitle,
    message,
  });
}

export function clampOperationsDays(
  input: string | undefined,
  fallback = 7,
): number {
  const n = Number.parseInt((input ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < 1) return 1;
  if (n > 30) return 30;
  return n;
}
