import { Deps } from "./deps";
import { ProviderError } from "./types";

const TIMEOUT_MS = 15_000;
// Used when a 429 has no usable Retry-After. Providers that rate limit usually reset within minutes.
const DEFAULT_RETRY_MS = 5 * 60_000;
// Caps a long Retry-After, so a provider asking for hours doesn't lock the extension out that long. Connect still
// asks at once, since a changed login is a reason to ask again.
const MAX_RETRY_MS = 60 * 60_000;

export interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  // Sent as JSON when it is an object, or as-is when it is a string.
  body?: unknown;
  // Shown in error messages, such as "Claude".
  provider: string;
  // Hint shown when the provider answers 401 or 403.
  authHint?: string;
}

// Fetches a URL and parses the JSON body. A 401 or 403 throws an "auth" ProviderError, any other non-2xx status or a
// network failure throws "http", and a body that isn't JSON throws "parse".
export async function requestJson(deps: Deps, url: string, options: RequestOptions): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  let body: string | undefined;
  if (typeof options.body === "string") {
    body = options.body;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] ??= "application/json";
  }

  let response: Response;
  try {
    response = await deps.fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ProviderError("http", `Couldn't reach ${options.provider}: ${reason}`);
  }

  const text = await response.text();
  const now = deps.now();
  // A bot check (Cloudflare's challenge page) also answers 403, but the credentials may be fine. Calling it a rejected
  // login would send the user to replace a cookie that still works.
  if (response.status === 403 && isBotChallenge(response, text)) {
    throw new ProviderError(
      "http",
      `${options.provider} blocked the request with a bot check (HTTP 403). Try again later, or open the site in your browser first`,
      undefined,
      response.status,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new ProviderError(
      "auth",
      `${options.provider} rejected the credentials (HTTP ${response.status})`,
      options.authHint,
      response.status,
    );
  }
  if (response.status === 429) {
    const delayMs = retryDelayMs(response.headers.get("retry-after"), now);
    throw new ProviderError(
      "http",
      `${options.provider} is rate limiting requests (HTTP 429)`,
      `The extension waits ${Math.ceil(delayMs / 60_000)} min before asking ${options.provider} again`,
      response.status,
      undefined,
      now + delayMs,
    );
  }
  if (!response.ok) {
    throw new ProviderError("http", `${options.provider} returned HTTP ${response.status}`, undefined, response.status);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError("parse", `${options.provider} returned a response that isn't JSON`);
  }
}

// How long to wait before asking again, from a Retry-After header. The header is either a number of seconds or an HTTP
// date. A missing or unusable value, or one that is already past, gives DEFAULT_RETRY_MS. Longer waits are capped.
export function retryDelayMs(header: string | null, now: number): number {
  const value = header?.trim() ?? "";
  const delay = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  if (!Number.isFinite(delay) || delay <= 0) {
    return DEFAULT_RETRY_MS;
  }
  return Math.min(delay, MAX_RETRY_MS);
}

function isBotChallenge(response: Response, text: string): boolean {
  if (response.headers.get("cf-mitigated") === "challenge") {
    return true;
  }
  const html = (response.headers.get("content-type") ?? "").includes("text/html") || /^\s*</.test(text);
  return html && /challenge|cf-chl|just a moment/i.test(text);
}

// Small readers for untyped JSON. They return undefined instead of throwing, so parsers can stay lenient about shapes
// that change between provider releases.

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// Accepts numbers and numeric strings, since several providers send amounts as strings.
export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// Parses an ISO 8601 string, epoch seconds or epoch milliseconds into epoch milliseconds.
export function asTimestamp(value: unknown): number | null {
  if (typeof value === "string") {
    const numeric = asNumber(value);
    if (numeric === undefined) {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    value = numeric;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    // Anything below 1e12 is in seconds (1e12 ms is September 2001).
    return value < 1e12 ? value * 1000 : value;
  }
  return null;
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// Decodes a JWT's payload without verifying it. Used only to read display fields such as the email.
export function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const part = token.split(".")[1];
  if (!part) {
    return undefined;
  }
  try {
    return asRecord(JSON.parse(Buffer.from(part, "base64url").toString("utf8")));
  } catch {
    return undefined;
  }
}

// "pro_plus" -> "Pro Plus", "enterprise" -> "Enterprise". For plan names that providers send as identifiers.
export function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
