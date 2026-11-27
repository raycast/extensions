/**
 * The one API call the command makes: create a short link, anonymously or with the user's API key.
 *
 * Copies of the same knowledge live in `mcp/src/api.ts` (`hintFor`, `rateLimitHint`) and
 * `extension/src/lib/api.ts` (the anonymous create); each cites the others, and a change to an error code they branch
 * on is checked in all three (ADR 0022, Decision 4). This package imports nothing from either.
 *
 * Nothing here is thrown: every failure is a result the view shows. No client hint is sent (spec 0143, Decision 2),
 * so the API records the link as `anonymous`, or `api` with a key. A Node `fetch` sends no `Origin`, which the
 * API's site-origin guard lets through. The key is sent only in `Authorization` and is kept out of every result.
 */

import { TITLES } from "./view";

export const API_BASE_URL = "https://api.linkonda.com";

/** Screening can take 10 s behind a back-off (Decision 14). */
const TIMEOUT_MS = 20_000;

export type FailureKind =
  "quota" | "rate-limited" | "blocked" | "invalid-url" | "key" | "unavailable" | "other" | "network" | "unexpected";

export type ShortLink = {
  id: string;
  slug: string;
  shortUrl: string;
  expiresAt: string | null;
  savedToAccount: boolean;
};

export type ShortenResult =
  | { ok: true; link: ShortLink }
  | {
      ok: false;
      kind: FailureKind;
      title: string;
      /** The API's `error` text, as sent. The view cuts and escapes it. */
      message?: string;
      code?: string;
      status?: number;
      /** The `Retry-After` header as sent. */
      retryAfter?: string;
      /** For `quota` only: whether the limit is the one for links without an account (N-1) or a plan's (N-2). */
      anonymous?: boolean;
    };

const KEY_REJECTED = new Set(["INVALID_API_KEY", "API_KEY_REVOKED"]);
const KEY_CANNOT_CREATE = new Set(["API_KEY_REQUIRES_PAID", "API_KEY_LIMIT_EXCEEDED", "EMAIL_NOT_VERIFIED"]);
const INVALID_URL = new Set(["INVALID_URL", "VALIDATION_FAILED"]);

type Fail = Extract<ShortenResult, { ok: false }>;

const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function parseJson(text: string): Record<string, unknown> | undefined {
  try {
    const data: unknown = JSON.parse(text);
    return typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** The code decides the kind, whatever the status, except for 5xx (AC-4). */
function failureFor(status: number, data: Record<string, unknown> | undefined, hasKey: boolean): Fail {
  const code = asString(data?.code);
  const base = { message: asString(data?.error), code, status };
  if (status >= 500) return { ok: false, kind: "unavailable", title: TITLES.unavailable, ...base };
  if (code === "QUOTA_EXCEEDED") {
    const tier = asString(data?.tier);
    const anonymous = tier === undefined ? !hasKey : tier === "anonymous";
    return {
      ok: false,
      kind: "quota",
      title: anonymous ? TITLES.quotaAnonymous : TITLES.quotaAccount,
      anonymous,
      ...base,
    };
  }
  if (code === "RATE_LIMITED") return { ok: false, kind: "rate-limited", title: TITLES.rateLimited, ...base };
  if (code === "DESTINATION_BLOCKED") return { ok: false, kind: "blocked", title: TITLES.blocked, ...base };
  if (code !== undefined && INVALID_URL.has(code))
    return { ok: false, kind: "invalid-url", title: TITLES.invalidUrl, ...base };
  if (code !== undefined && KEY_REJECTED.has(code)) return { ok: false, kind: "key", title: TITLES.key, ...base };
  if (code !== undefined && KEY_CANNOT_CREATE.has(code))
    return { ok: false, kind: "key", title: TITLES.keyCannotCreate, ...base };
  return { ok: false, kind: "other", title: TITLES.other, ...base };
}

export async function createShortLink(
  url: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ShortenResult> {
  const key = apiKey?.trim() || undefined;
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  let response: Response;
  let text: string;
  try {
    response = await fetchImpl(`${API_BASE_URL}/api/links`, {
      method: "POST",
      headers,
      // A redirect would carry the Authorization header to wherever it points.
      redirect: "error",
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await response.text();
  } catch {
    return { ok: false, kind: "network", title: TITLES.network };
  }

  const data = parseJson(text);

  if (!response.ok) {
    const failure = failureFor(response.status, data, key !== undefined);
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter !== null) failure.retryAfter = retryAfter;
    // The API has no reason to echo a key, but the key must appear in no result: drop it from the text if it does.
    if (key && failure.message) failure.message = failure.message.split(key).join("");
    return failure;
  }

  const id = asString(data?.id);
  const slug = asString(data?.slug);
  const shortUrl = asString(data?.shortUrl);
  // `expiresAt` is a string or null; anything else (or absent) is not the API's answer, and "Never" would be a guess.
  const expiresAt = data?.expiresAt;
  if (
    id === undefined ||
    slug === undefined ||
    shortUrl === undefined ||
    !isHttpsUrl(shortUrl) ||
    (typeof expiresAt !== "string" && expiresAt !== null)
  ) {
    return { ok: false, kind: "unexpected", title: TITLES.unexpected, status: response.status };
  }
  return {
    ok: true,
    link: {
      id,
      slug,
      shortUrl,
      expiresAt,
      savedToAccount: data?.savedToAccount === true,
    },
  };
}
