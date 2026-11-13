import { createHash } from "node:crypto";
import * as mockApi from "../mocks/api";
import { MOCK_API } from "../mocks/config";
import { ClientInfoResponse, CurrencyRateResponse, ErrorResponse, StatementItemResponse } from "./types";

const API_URL = "https://api.monobank.ua";

/** No access token is set in the preferences. */
export class MissingTokenError extends Error {
  constructor() {
    super("Access token is not set");
    this.name = "MissingTokenError";
  }
}

/** The access token is malformed or rejected by Monobank. */
export class InvalidTokenError extends Error {
  constructor(message = "Invalid access token") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export type TokenError = "missing" | "invalid";

/** Whether `error` is caused by the access token, and how. */
export function getTokenError(error: unknown): TokenError | undefined {
  if (error instanceof MissingTokenError) return "missing";
  if (error instanceof InvalidTokenError) return "invalid";
  return undefined;
}

/** Any other failed response. `description` is monobank's `errorDescription`, when there is one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly description: string | undefined,
    path: string,
  ) {
    super(`Request to ${path} failed with status ${status}${description ? `: ${description}` : ""}`);
    this.name = "ApiError";
  }
}

/** Monobank answered 429: a personal endpoint was called again within its rate limit. */
export class RateLimitError extends ApiError {
  constructor(description: string | undefined, path: string) {
    super(429, description, path);
    this.name = "RateLimitError";
  }
}

async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(API_URL + path, {
    headers: token ? { "X-Token": token } : {},
  });

  if (response.status === 401 || response.status === 403) {
    throw new InvalidTokenError(`Access token was rejected with status ${response.status}`);
  }

  if (!response.ok) {
    const description = await getErrorDescription(response);
    throw response.status === 429
      ? new RateLimitError(description, path)
      : new ApiError(response.status, description, path);
  }

  return (await response.json()) as T;
}

/** Best effort: the body may be missing or not JSON. */
async function getErrorDescription(response: Response) {
  try {
    const body = (await response.json()) as ErrorResponse;
    return typeof body?.errorDescription === "string" ? body.errorDescription : undefined;
  } catch {
    return undefined;
  }
}

// Tokens are often pasted with a trailing newline.
function normalizeToken(token: string | undefined) {
  return token?.trim() ?? "";
}

/**
 * Identifies which token cached data belongs to, without storing the token itself.
 * Returns an empty string when there is no token.
 */
export function getTokenFingerprint(token: string | undefined) {
  // Mock data has its own scope, so a real token's cached data is never shown with it, or the other way around.
  if (MOCK_API) return "mock";
  const normalizedToken = normalizeToken(token);
  return normalizedToken ? createHash("sha256").update(normalizedToken).digest("hex") : "";
}

/**
 * Identifies the owner of a token by monobank's `clientId`, without storing the id itself. Two tokens of the same
 * person have the same fingerprint, so data cached for one can be kept for the other.
 */
export function getClientFingerprint(clientId: string) {
  return createHash("sha256").update(clientId).digest("hex");
}

/**
 * Returns the normalized token, or throws `MissingTokenError` / `InvalidTokenError`.
 * Lets callers detect token problems before spending a rate-limited request.
 */
export function requireToken(token: string | undefined) {
  // The mock API needs no token, so demos work without one.
  if (MOCK_API) return "mock";
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    throw new MissingTokenError();
  }

  // Whitespace inside the token would make `fetch` throw on the header value, so reject it before the request.
  if (/\s/.test(normalizedToken)) {
    throw new InvalidTokenError("Access token is malformed");
  }

  return normalizedToken;
}

export async function getClientInfo(token: string | undefined) {
  if (MOCK_API) return mockApi.getClientInfo();
  return request<ClientInfoResponse>("/personal/client-info", requireToken(token));
}

/**
 * Transactions of an account or jar (`"0"` is the default account), newest first.
 * `from` and `to` are unix seconds; without `to`, the period ends now. The period can be at most
 * 31 days and 1 hour long, and monobank allows one call per 60 seconds.
 */
export async function getStatement(token: string | undefined, account: string, from: number, to?: number) {
  if (MOCK_API) return mockApi.getStatement(account, from, to);
  const path = `/personal/statement/${encodeURIComponent(account)}/${from}${to !== undefined ? `/${to}` : ""}`;
  return request<StatementItemResponse[]>(path, requireToken(token));
}

export function getCurrencyRates() {
  if (MOCK_API) return mockApi.getCurrencyRates();
  return request<CurrencyRateResponse[]>("/bank/currency");
}
