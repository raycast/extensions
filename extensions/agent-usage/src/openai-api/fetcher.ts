import { httpFetch } from "../agents/http.ts";
import type { OpenAIApiError, OpenAIApiUsage } from "./types.ts";

// Undocumented dashboard endpoint behind platform.openai.com/settings/organization/billing. OpenAI has
// no public balance API: an Admin key reads spend only, and this route rejects API keys outright.
const OPENAI_CREDIT_GRANTS_API = "https://api.openai.com/v1/dashboard/billing/credit_grants";
const SESSION_EXPIRED_MESSAGE =
  "OpenAI platform session expired. Copy a fresh session token from platform.openai.com and paste it in extension settings.";
const API_KEY_MESSAGE =
  "OpenAI serves the credit balance only to the platform.openai.com browser session, not to API keys. Paste the session token (the Bearer value sent to api.openai.com from the billing page) in extension settings.";

type OpenAIApiResult = { usage: OpenAIApiUsage | null; error: OpenAIApiError | null };

/** Accept the token bare, as `Bearer <token>`, or as a whole `Authorization: Bearer <token>` header line. */
export function normalizeOpenAISessionToken(value: string | undefined): string | null {
  const token = value
    ?.trim()
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer(?:\s+|$)/i, "")
    .trim();
  return token ? token : null;
}

/** Secret, project, and admin keys all start with `sk-`; the dashboard answers them with 403. */
export function isOpenAIApiKey(token: string): boolean {
  return token.startsWith("sk-");
}

function parseError(field: string): { usage: null; error: OpenAIApiError } {
  return { usage: null, error: { type: "parse_error", message: `Invalid OpenAI credit grants response: ${field}` } };
}

function amount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseOpenAICreditGrants(data: unknown, now = Date.now()): OpenAIApiResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) return parseError("expected an object");
  const root = data as Record<string, unknown>;

  const totalGranted = amount(root.total_granted);
  const totalUsed = amount(root.total_used);
  const totalAvailable = amount(root.total_available);
  if (totalGranted === undefined || totalUsed === undefined || totalAvailable === undefined) {
    return parseError("totals");
  }

  let nextExpiringGrant: OpenAIApiUsage["nextExpiringGrant"] = null;
  if (root.grants !== undefined && root.grants !== null) {
    const list = (root.grants as { data?: unknown }).data;
    if (!Array.isArray(list)) return parseError("grants");
    for (const raw of list) {
      if (!raw || typeof raw !== "object") return parseError("grant");
      const grant = raw as Record<string, unknown>;
      const granted = amount(grant.grant_amount);
      const used = grant.used_amount === undefined || grant.used_amount === null ? 0 : amount(grant.used_amount);
      const expiresAt = amount(grant.expires_at);
      if (granted === undefined) return parseError("grant amount");
      if (used === undefined) return parseError("grant used amount");
      // Expiry is unix seconds; a grant without one never lapses.
      if (expiresAt === undefined || expiresAt * 1000 <= now || granted - used <= 0) continue;
      if (!nextExpiringGrant || expiresAt * 1000 < Date.parse(nextExpiringGrant.expiresAt)) {
        nextExpiringGrant = { remaining: granted - used, expiresAt: new Date(expiresAt * 1000).toISOString() };
      }
    }
  }

  return { usage: { totalGranted, totalUsed, totalAvailable, nextExpiringGrant }, error: null };
}

export async function fetchOpenAIApiUsage(sessionToken: string): Promise<OpenAIApiResult> {
  if (isOpenAIApiKey(sessionToken)) {
    return { usage: null, error: { type: "not_configured", message: API_KEY_MESSAGE } };
  }

  const { data, error } = await httpFetch({
    url: OPENAI_CREDIT_GRANTS_API,
    token: sessionToken,
    headers: { Accept: "application/json" },
    unauthorizedMessage: SESSION_EXPIRED_MESSAGE,
    forbiddenMessage: API_KEY_MESSAGE,
  });
  if (error) return { usage: null, error };
  return parseOpenAICreditGrants(data);
}
