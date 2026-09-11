import { getPreferenceValues } from "@raycast/api";

const API_BASE = "https://api.usebouncer.com/v1.1";

/** Bouncer caps the server-side verification timeout at 30 seconds. */
const VERIFY_TIMEOUT_SECONDS = 20;

/** Give the socket a little longer than Bouncer's own timeout before giving up locally. */
const REQUEST_TIMEOUT_MS = (VERIFY_TIMEOUT_SECONDS + 10) * 1000;

const CREDITS_TIMEOUT_MS = 10_000;

/**
 * Bouncer reports tri-state signals as strings, not booleans.
 * See https://docs.usebouncer.com/api-reference/real-time/verify-email
 */
export type Flag = "yes" | "no" | "unknown";

export type BouncerStatus = "deliverable" | "risky" | "undeliverable" | "unknown";

export type BouncerReason =
  | "accepted_email"
  | "low_deliverability"
  | "low_quality"
  | "invalid_email"
  | "invalid_domain"
  | "rejected_email"
  | "dns_error"
  | "unavailable_smtp"
  | "unsupported"
  | "timeout"
  | "unknown";

export type EmailRecord = {
  email: string;
  status: BouncerStatus;
  reason?: BouncerReason;
  domain?: {
    name?: string;
    acceptAll?: Flag;
    disposable?: Flag;
    free?: Flag;
  };
  account?: {
    role?: Flag;
    disabled?: Flag;
    fullMailbox?: Flag;
  };
  dns?: {
    type?: string;
    record?: string;
  };
  provider?: string;
  score?: number;
  toxic?: Flag;
  toxicity?: number;
  /** Suggested correction when the address looks like a typo. */
  didYouMean?: string;
  /** ISO timestamp set when the mail server greylisted the check. */
  retryAfter?: string;
};

/** Domain lookups return the domain half of an EmailRecord: no status, score, or account. */
export type DomainRecord = {
  domain?: {
    name?: string;
    acceptAll?: Flag;
    disposable?: Flag;
    free?: Flag;
  };
  dns?: {
    type?: string;
    record?: string;
  };
  provider?: string;
  toxic?: Flag;
};

type ErrorPayload = {
  message?: string;
  error?: string;
};

export class BouncerError extends Error {
  readonly statusCode?: number;
  readonly outOfCredits: boolean;

  constructor(message: string, statusCode?: number, outOfCredits = false) {
    super(message);
    this.name = "BouncerError";
    this.statusCode = statusCode;
    this.outOfCredits = outOfCredits;
  }
}

async function request<T>(url: URL, signal: AbortSignal | undefined, timeoutMs: number): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { headers: { "x-api-key": apiKey }, signal: combined });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new BouncerError("Bouncer did not respond in time. The mail server may be slow — try again.");
    }
    throw new BouncerError("Could not reach Bouncer. Check your internet connection.");
  }

  const payload = (await response.json().catch(() => null)) as (T & ErrorPayload) | null;

  if (!response.ok) {
    throw toBouncerError(response.status, payload);
  }

  if (!payload) {
    throw new BouncerError("Bouncer returned an unreadable response.");
  }

  return payload;
}

function toBouncerError(statusCode: number, payload: ErrorPayload | null): BouncerError {
  const detail = payload?.message || payload?.error;

  switch (statusCode) {
    case 400:
      return new BouncerError(detail || "Bouncer rejected the address as malformed.", statusCode);
    case 401:
    case 403:
      return new BouncerError("Bouncer rejected the API key. Update it in extension preferences.", statusCode);
    case 402:
      return new BouncerError("You are out of Bouncer credits. Top up to keep verifying.", statusCode, true);
    case 429:
      return new BouncerError("Bouncer rate limit reached. Wait a moment and try again.", statusCode);
    default:
      if (statusCode >= 500) {
        return new BouncerError("Bouncer is temporarily unavailable. Try again shortly.", statusCode);
      }
      return new BouncerError(detail || `Bouncer request failed (${statusCode}).`, statusCode);
  }
}

export async function verifyEmail(email: string, signal?: AbortSignal): Promise<EmailRecord> {
  const url = new URL(`${API_BASE}/email/verify`);
  url.searchParams.set("email", email);
  url.searchParams.set("timeout", String(VERIFY_TIMEOUT_SECONDS));

  const record = await request<EmailRecord>(url, signal, REQUEST_TIMEOUT_MS);

  // Greylisted checks come back without a usable status.
  if (!record.status && record.retryAfter) {
    throw new BouncerError(
      `The mail server greylisted this check. Retry after ${formatRetryAfter(record.retryAfter)}.`,
    );
  }

  return { ...record, email: record.email || email };
}

/** Costs one credit, same as verifying a single address. */
export async function verifyDomain(domain: string, signal?: AbortSignal): Promise<DomainRecord> {
  const url = new URL(`${API_BASE}/domain`);
  url.searchParams.set("domain", domain);

  const record = await request<DomainRecord>(url, signal, REQUEST_TIMEOUT_MS);
  return { ...record, domain: { ...record.domain, name: record.domain?.name || domain } };
}

export async function fetchCredits(signal?: AbortSignal): Promise<number> {
  const url = new URL(`${API_BASE}/credits`);
  const payload = await request<{ credits: number }>(url, signal, CREDITS_TIMEOUT_MS);
  return payload.credits;
}

function formatRetryAfter(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
