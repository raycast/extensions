import type { z } from "zod";
import { customEndpointHost, hostForLog } from "../baseUrl";
import { createLogger } from "../logger";
import {
  isProviderError,
  isTransient,
  providerError,
  providerErrorLogFields,
  type ProviderErrorSurface,
  type RateLimitDiagnostics,
} from "../providerError";
import type { ProviderId } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 400;

const MAX_ERROR_BODY_CHARS = 500;
const log = createLogger("provider");

type HttpErrorContext = {
  provider: ProviderId;
  surface: ProviderErrorSurface;
  model: string;
  /** The value `resolveBaseUrl` returned for this request. */
  resolvedBaseUrl: string;
  /** Provider-specific 429 body parser; the `Retry-After` header is read for every provider. */
  parseRateLimit?: (body: string) => RateLimitDiagnostics | undefined;
};

type PostRequest = {
  url: string;
  /** Auth and version headers; `Content-Type: application/json` is always added. */
  headers: Record<string, string>;
  body: unknown;
  signal?: AbortSignal;
  context: HttpErrorContext;
};

/** Exponential backoff with full jitter. attempt is 1-based. */
function getRetryDelayMs(attempt: number): number {
  const ceiling = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
  return Math.floor(Math.random() * ceiling);
}

/**
 * Sleep that resolves early if the signal aborts. Throws the abort reason
 * (matching fetch's behavior) when the signal fires during the wait.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function safeParseRateLimit(parse: HttpErrorContext["parseRateLimit"], body: string): RateLimitDiagnostics | undefined {
  if (!parse) return undefined;
  try {
    return parse(body);
  } catch {
    return undefined;
  }
}

/** Integer seconds are rewritten to the `21s` shape Gemini's RetryInfo uses; HTTP dates pass through. */
function retryAfterDelay(response: Response): string | undefined {
  const raw = response.headers.get("retry-after")?.trim();
  if (!raw) return undefined;
  return /^\d+$/u.test(raw) ? `${raw}s` : raw.slice(0, 64);
}

function rateLimitFor(
  response: Response,
  rawBody: string,
  parse: HttpErrorContext["parseRateLimit"],
): RateLimitDiagnostics | undefined {
  const fromBody = response.status === 429 ? safeParseRateLimit(parse, rawBody) : undefined;
  const retryDelay = fromBody?.retryDelay ?? retryAfterDelay(response);
  if (!fromBody && !retryDelay) return undefined;
  return { ...fromBody, retryDelay };
}

/**
 * Map a provider HTTP response to the right `providerError` and throw it.
 * Returns silently on `response.ok` so the caller can read the body.
 *
 * A 404 cannot distinguish a retired model from a base URL pointing at the
 * wrong path, so the endpoint is named in the error when it is not the
 * provider's default.
 */
async function throwForHttpError(response: Response, context: HttpErrorContext): Promise<void> {
  const { provider, surface, model, resolvedBaseUrl } = context;
  if (response.status === 401 || response.status === 403) {
    throw providerError({ domain: "infrastructure", kind: "invalid-api-key", surface, provider });
  }
  if (response.status === 404) {
    throw providerError({
      domain: "infrastructure",
      kind: "model-not-found",
      surface,
      provider,
      model,
      endpointHost: customEndpointHost(resolvedBaseUrl, provider),
    });
  }
  if (!response.ok) {
    let rawBody = "";
    try {
      rawBody = await response.text();
    } catch {
      // body unreadable - proceed with empty
    }
    throw providerError({
      domain: "infrastructure",
      kind: "request-failed",
      surface,
      provider,
      status: response.status,
      body: rawBody.slice(0, MAX_ERROR_BODY_CHARS),
      rateLimit: rateLimitFor(response, rawBody, context.parseRateLimit),
    });
  }
}

/** One POST: fetch's network TypeError becomes `network-offline`, HTTP failures go through `throwForHttpError`. */
export async function post(req: PostRequest): Promise<Response> {
  const { provider, surface } = req.context;
  let response: Response;
  try {
    response = await fetch(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...req.headers },
      body: JSON.stringify(req.body),
      signal: req.signal,
      // Fetch retains custom API-key headers across cross-origin redirects.
      redirect: "manual",
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw providerError({ domain: "infrastructure", kind: "network-offline", surface, provider });
    }
    throw err;
  }

  await throwForHttpError(response, req.context);
  return response;
}

/** `post` with up to MAX_RETRY_ATTEMPTS tries on transient failures (`isTransient`). */
export async function postWithRetry(req: PostRequest): Promise<Response> {
  const { provider, model, resolvedBaseUrl, surface } = req.context;
  log.debug("request started", { provider, surface, model, host: hostForLog(resolvedBaseUrl) });

  for (let attempt = 1; ; attempt++) {
    const attemptMs = log.timer();
    try {
      const response = await post(req);
      log.debug("attempt succeeded", { provider, model, attempt, attemptMs: attemptMs(), status: response.status });
      return response;
    } catch (err) {
      const canRetry = attempt < MAX_RETRY_ATTEMPTS && isProviderError(err) && isTransient(err);
      log.warn(canRetry ? "attempt failed; retrying" : "attempt failed", {
        model,
        attempt,
        attemptMs: attemptMs(),
        ...providerErrorLogFields(err),
        willRetry: canRetry,
      });
      if (!canRetry) throw err;
      await abortableSleep(getRetryDelayMs(attempt), req.signal);
    }
  }
}

/**
 * Read a successful response body and validate it against the provider's API
 * envelope. A non-JSON or off-schema body means the server misbehaved:
 * `invalid-response`. An abort while reading keeps propagating as an abort.
 */
export async function readApiResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  context: { provider: ProviderId; surface: ProviderErrorSurface; signal?: AbortSignal },
): Promise<T> {
  const invalid = () =>
    providerError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: context.surface,
      provider: context.provider,
    });
  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    if (context.signal?.aborted) throw err;
    throw invalid();
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw invalid();
  return parsed.data;
}

/** Models sometimes wrap JSON in a Markdown fence even when structured output is requested. */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}
