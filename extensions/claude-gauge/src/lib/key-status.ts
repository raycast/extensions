/**
 * Standard-key status probe for the Anthropic API.
 *
 * A STANDARD key (`sk-ant-api…`) cannot read the organization usage/cost
 * reports (those require an Admin key). What it CAN reveal is: whether it is
 * valid, how many models it can see, and the current rate-limit budget exposed
 * via response headers. This module gathers exactly that with two tiny calls:
 *
 *  1. `GET /v1/models`           → validate the key + count available models.
 *  2. `POST /v1/messages` (probe)→ read rate-limit budget from response headers.
 *
 * The probe is a 1-token request to the cheapest model, so its cost is
 * negligible; we discard its body and keep only the headers.
 *
 * Security: the key is read by the caller and passed in here; it is NEVER
 * logged, stringified, embedded in an error message, or surfaced anywhere.
 */

const API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
/** Cheapest model — used only to elicit rate-limit headers from a 1-token call. */
const PROBE_MODEL = "claude-haiku-4-5";

/** Classify a configured key without revealing it. */
export function keyKind(key?: string): "empty" | "admin" | "standard" {
  const trimmed = (key ?? "").trim();
  if (trimmed === "") return "empty";
  if (trimmed.startsWith("sk-ant-admin")) return "admin";
  return "standard";
}

/** One rate-limit window's budget, as read from the response headers. */
export type RateWindow = {
  limit: number | null;
  remaining: number | null;
  resetsAt: Date | null;
};

/** Result of probing a standard key — a discriminated union. */
export type KeyStatusResult =
  | {
      ok: true;
      modelsCount: number | null;
      requests: RateWindow;
      tokens: RateWindow;
      inputTokens: RateWindow;
      outputTokens: RateWindow;
      retryAfterSec: number | null;
      probedAt: Date;
    }
  | {
      ok: false;
      kind: "auth" | "network" | "error";
      message: string;
    };

// --- guarded parsers -------------------------------------------------------

/** Parse a header value as a finite number, or `null` when absent/garbage. */
function num(value: string | null): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse a header value as an RFC3339 date, or `null` when absent/invalid. */
function date(value: string | null): Date | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emptyWindow(): RateWindow {
  return { limit: null, remaining: null, resetsAt: null };
}

/**
 * Read one rate-limit window from the headers. `prefix` is the family segment,
 * e.g. `requests`, `tokens`, `input-tokens`, `output-tokens`. Headers are read
 * via `Headers.get`, which is case-insensitive.
 */
function readWindow(headers: Headers, prefix: string): RateWindow {
  return {
    limit: num(headers.get(`anthropic-ratelimit-${prefix}-limit`)),
    remaining: num(headers.get(`anthropic-ratelimit-${prefix}-remaining`)),
    resetsAt: date(headers.get(`anthropic-ratelimit-${prefix}-reset`)),
  };
}

/** Build a friendly network message WITHOUT ever including the key. */
function networkMessage(err: unknown): string {
  const detail =
    err instanceof Error && err.message ? err.message : "network error";
  return `Could not reach the Anthropic API. Check your connection. (${detail})`;
}

// --- public API ------------------------------------------------------------

/**
 * Probe a standard key for validity, model count, and rate-limit budget.
 * Never throws: failures degrade to `{ ok: false, ... }`.
 */
export async function getKeyStatus(key: string): Promise<KeyStatusResult> {
  const authHeaders: Record<string, string> = {
    "x-api-key": key,
    "anthropic-version": ANTHROPIC_VERSION,
  };

  // (a) Validate the key and count available models.
  let modelsCount: number | null = null;
  try {
    const res = await fetch(`${API_BASE}/models`, {
      method: "GET",
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: "auth", message: "Invalid API key (401/403)." };
    }
    if (res.ok) {
      try {
        const json: unknown = await res.json();
        const data = (json as { data?: unknown } | null)?.data;
        if (Array.isArray(data)) modelsCount = data.length;
      } catch {
        // Non-fatal: leave modelsCount as null if the body isn't JSON.
      }
    }
  } catch (err) {
    return { ok: false, kind: "network", message: networkMessage(err) };
  }

  // (b) Read the rate-limit budget via one minimal probe. Only a 401/403 is
  // fatal here — any other non-2xx (model unavailable, 400, 429, …) still
  // carries the rate-limit headers we want, so we read them regardless.
  let requests = emptyWindow();
  let tokens = emptyWindow();
  let inputTokens = emptyWindow();
  let outputTokens = emptyWindow();
  let retryAfterSec: number | null = null;
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        model: PROBE_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "." }],
      }),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: "auth", message: "Invalid API key (401/403)." };
    }
    requests = readWindow(res.headers, "requests");
    tokens = readWindow(res.headers, "tokens");
    inputTokens = readWindow(res.headers, "input-tokens");
    outputTokens = readWindow(res.headers, "output-tokens");
    retryAfterSec = num(res.headers.get("retry-after"));
    // We only need the headers — the body is intentionally discarded.
  } catch (err) {
    return { ok: false, kind: "network", message: networkMessage(err) };
  }

  return {
    ok: true,
    modelsCount,
    requests,
    tokens,
    inputTokens,
    outputTokens,
    retryAfterSec,
    probedAt: new Date(),
  };
}
