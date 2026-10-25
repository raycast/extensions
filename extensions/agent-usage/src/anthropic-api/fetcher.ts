import { httpFetch } from "../agents/http.ts";
import type { HttpFetchOptions, HttpFetchResult } from "../agents/http.ts";
import type { AnthropicApiCreditGrant, AnthropicApiError, AnthropicApiUsage } from "./types.ts";

// Undocumented Console endpoints behind platform.claude.com/settings/billing. The Admin API reports
// spend but not the prepaid balance, and it is unavailable to individual Console accounts.
const CONSOLE_ORIGIN = "https://platform.claude.com";
const CONSOLE_HEADERS = {
  Accept: "application/json",
  Origin: CONSOLE_ORIGIN,
  Referer: `${CONSOLE_ORIGIN}/settings/billing`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
};
const SESSION_COOKIE = "sessionKey";
const ACTIVE_ORG_COOKIE = "lastActiveOrg";
const FORWARDED_COOKIES = new Set([SESSION_COOKIE, ACTIVE_ORG_COOKIE]);
const COOKIE_HEADER_PATTERN = /;|^(?:sessionKey|lastActiveOrg)=/;
const ORGANIZATION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const SESSION_EXPIRED_MESSAGE =
  "Claude Console session expired. Sign in at platform.claude.com and paste a fresh sessionKey cookie in extension settings.";
const BILLING_DENIED_MESSAGE =
  "Claude Console billing access was denied for every API organization on this account. Ask the organization owner for billing access.";

type AnthropicApiResult = { usage: AnthropicApiUsage | null; error: AnthropicApiError | null };
type ConsoleRequest = (options: HttpFetchOptions) => Promise<HttpFetchResult>;

export interface ConsoleOrganization {
  id: string;
  name: string | null;
}

/**
 * Reduce a pasted Cookie header to the cookies the Console needs.
 * Any other input is taken as the bare `sessionKey` value copied from DevTools.
 * Returns null when no non-empty session cookie is present.
 */
export function normalizeAnthropicConsoleCookie(value: string | undefined): string | null {
  const trimmed = value
    ?.trim()
    .replace(/^cookie:\s*/i, "")
    .trim();
  if (!trimmed) return null;

  if (!COOKIE_HEADER_PATTERN.test(trimmed)) {
    return `${SESSION_COOKIE}=${trimmed}`;
  }

  const cookies = trimmed
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.includes("=") && FORWARDED_COOKIES.has(part.slice(0, part.indexOf("="))));
  const session = cookies.find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!session?.slice(SESSION_COOKIE.length + 1).trim()) return null;

  return cookies.join("; ");
}

function readCookie(cookieHeader: string, name: string): string | null {
  const part = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return part?.slice(name.length + 1).trim() || null;
}

function parseError(field: string): { usage: null; error: AnthropicApiError } {
  return { usage: null, error: { type: "parse_error", message: `Invalid Claude Console response: ${field}` } };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function minorUnits(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

/**
 * API-capable organizations from `/api/organizations`, with the Console's last active one first.
 * Claude.ai chat organizations share this list but own no Console billing, so they are dropped.
 * Returns null when the response is malformed.
 */
export function parseConsoleOrganizations(data: unknown, preferredId: string | null): ConsoleOrganization[] | null {
  if (!Array.isArray(data)) return null;

  const organizations: ConsoleOrganization[] = [];
  for (const value of data) {
    const organization = asObject(value);
    if (!organization) return null;
    const capabilities = organization.capabilities;
    if (!Array.isArray(capabilities) || !capabilities.includes("api")) continue;
    const id = text(organization.uuid);
    if (!id || !ORGANIZATION_ID_PATTERN.test(id)) return null;
    organizations.push({ id, name: text(organization.name) });
  }

  const preferred = organizations.findIndex((organization) => organization.id === preferredId);
  if (preferred > 0) organizations.unshift(...organizations.splice(preferred, 1));
  return organizations;
}

/** Console amounts are integers in minor units; `balance.credits.exponent` gives the scale (cents by default). */
function parseExponent(credits: Record<string, unknown>): number | undefined {
  const reported = asObject(asObject(credits.balance)?.credits)?.exponent;
  if (reported === undefined || reported === null) return 2;
  return typeof reported === "number" && Number.isInteger(reported) && reported >= 0 && reported <= 4
    ? reported
    : undefined;
}

export function parseAnthropicPrepaidCredits(
  data: unknown,
  organization: ConsoleOrganization,
  now = Date.now(),
): AnthropicApiResult {
  const credits = asObject(data);
  if (!credits) return parseError("expected an object");

  const currency = text(credits.currency) ?? "USD";
  if (!/^[A-Z]{3}$/.test(currency)) return parseError("currency");
  const exponent = parseExponent(credits);
  if (exponent === undefined) return parseError("currency exponent");
  const scale = 10 ** exponent;

  const amount = minorUnits(credits.amount);
  if (amount === undefined) return parseError("amount");

  const grants: AnthropicApiCreditGrant[] = [];
  for (const field of ["promo_tranches", "tranches"]) {
    const list = credits[field];
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list)) return parseError(field);
    for (const raw of list) {
      const tranche = asObject(raw);
      if (!tranche) return parseError(field);
      const remaining = minorUnits(tranche.remaining_amount_minor_units);
      if (remaining === undefined) return parseError(`${field} remaining amount`);
      // A malformed or missing date means an unknown expiry, never a failed refresh.
      const expiresAt = text(tranche.expires_at);
      const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
      if (remaining <= 0 || !expiresAt || !Number.isFinite(expiresAtMs) || expiresAtMs <= now) continue;
      grants.push({
        name: text(tranche.name) ?? (field === "tranches" ? "Purchased credit" : "API credit"),
        remaining: remaining / scale,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }
  }
  grants.sort((left, right) => Date.parse(left.expiresAt) - Date.parse(right.expiresAt));

  return {
    usage: {
      organizationName: organization.name,
      currency,
      balance: amount / scale,
      monthToDateSpend: null,
      nextExpiringGrant: grants[0] ?? null,
    },
    error: null,
  };
}

/** Month-to-date spend from `current_spend`, in the same minor units as the balance. Null when unreadable. */
export function parseAnthropicCurrentSpend(data: unknown, exponent = 2): number | null {
  const amount = minorUnits(asObject(data)?.amount);
  return amount === undefined || amount < 0 ? null : amount / 10 ** exponent;
}

export async function fetchAnthropicApiUsage(
  cookieHeader: string,
  request: ConsoleRequest = httpFetch,
): Promise<AnthropicApiResult> {
  const headers = { ...CONSOLE_HEADERS, Cookie: cookieHeader };
  // The organization list doubles as the session check; a rejected cookie answers 403.
  const organizationsResponse = await request({
    url: `${CONSOLE_ORIGIN}/api/organizations`,
    headers,
    unauthorizedMessage: SESSION_EXPIRED_MESSAGE,
    forbiddenMessage: SESSION_EXPIRED_MESSAGE,
  });
  if (organizationsResponse.error) return { usage: null, error: organizationsResponse.error };

  const organizations = parseConsoleOrganizations(
    organizationsResponse.data,
    readCookie(cookieHeader, ACTIVE_ORG_COOKIE),
  );
  if (!organizations) return parseError("organizations");
  if (organizations.length === 0) {
    return {
      usage: null,
      error: {
        type: "not_configured",
        message: "This Claude account has no Console API organization. Create one at platform.claude.com.",
      },
    };
  }

  // The first organization whose billing this member can read wins; 403 moves to the next one.
  for (const organization of organizations) {
    const creditsResponse = await request({
      url: `${CONSOLE_ORIGIN}/api/organizations/${organization.id}/prepaid/credits`,
      headers,
      unauthorizedMessage: SESSION_EXPIRED_MESSAGE,
    });
    if (creditsResponse.status === 403) continue;
    if (creditsResponse.error) return { usage: null, error: creditsResponse.error };

    const result = parseAnthropicPrepaidCredits(creditsResponse.data, organization);
    if (!result.usage) return result;

    // Spend is optional: a broken report must not discard an authenticated balance.
    const spendResponse = await request({
      url: `${CONSOLE_ORIGIN}/api/organizations/${organization.id}/current_spend`,
      headers,
    });
    const exponent = parseExponent(asObject(creditsResponse.data) ?? {}) ?? 2;
    const monthToDateSpend = spendResponse.error ? null : parseAnthropicCurrentSpend(spendResponse.data, exponent);
    return { usage: { ...result.usage, monthToDateSpend }, error: null };
  }

  return { usage: null, error: { type: "billing_denied", message: BILLING_DENIED_MESSAGE } };
}
