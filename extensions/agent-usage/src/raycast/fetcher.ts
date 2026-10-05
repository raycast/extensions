import { getRemainingPercentOrNull } from "../agents/format.ts";
import { httpFetch } from "../agents/http.ts";
import type { RaycastError, RaycastUsage } from "./types.ts";

// Unofficial website endpoint behind www.raycast.com/settings. The desktop app's
// backend.raycast.com route needs the app's OAuth bearer and rejects website cookies.
const RAYCAST_CREDITS_API = "https://www.raycast.com/frontend_api/current_user/ai_credits";
const RAYCAST_HEADERS = {
  Accept: "application/json",
  Origin: "https://www.raycast.com",
  Referer: "https://www.raycast.com/settings",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
};
const SESSION_COOKIE = "__raycast_session";
const FORWARDED_COOKIES = new Set([SESSION_COOKIE, "csrf_token"]);

type RaycastResult = { usage: RaycastUsage | null; error: RaycastError | null };

/**
 * Reduce a pasted Cookie header to the cookies the credits endpoint needs.
 * A bare value (no `=`) is taken as the `__raycast_session` value copied from DevTools.
 * Returns null when no non-empty session cookie is present.
 */
export function normalizeRaycastCookieHeader(value: string | undefined): string | null {
  const trimmed = value
    ?.trim()
    .replace(/^cookie:\s*/i, "")
    .trim();
  if (!trimmed) return null;

  if (!trimmed.includes("=") && !trimmed.includes(";")) {
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

function parseError(field: string): { usage: null; error: RaycastError } {
  return { usage: null, error: { type: "parse_error", message: `Invalid Raycast credits response: ${field}` } };
}

/** Credit amounts arrive as decimal strings ("337.3751") or numbers; anything else is malformed. */
function parseAmount(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Turn a tier id into a label: `pro` → "Pro", `pro_plus` → "Pro+", `team` → "Team". */
function formatPlan(tier: unknown): string | null {
  if (typeof tier !== "string") return null;
  const words = tier
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  return words
    .map((word) => (word.toLowerCase() === "plus" ? "+" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ")
    .replace(/ \+/g, "+");
}

export function parseRaycastCredits(data: unknown): RaycastResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) return parseError("expected an object");
  const root = data as Record<string, unknown>;

  const remainingCredits = parseAmount(root.remaining_balance_credits);
  if (remainingCredits === undefined || (remainingCredits !== null && remainingCredits < 0)) {
    return parseError("remaining_balance_credits");
  }
  const totalCredits = parseAmount(root.total_balance_credits);
  if (totalCredits === undefined || (totalCredits !== null && totalCredits < 0)) {
    return parseError("total_balance_credits");
  }
  if (remainingCredits === null && totalCredits === null) return parseError("no credit amounts");

  let nextCreditsAt: string | null = null;
  if (root.next_credits_at !== undefined && root.next_credits_at !== null) {
    if (typeof root.next_credits_at !== "string" || Number.isNaN(Date.parse(root.next_credits_at))) {
      return parseError("next_credits_at");
    }
    nextCreditsAt = root.next_credits_at;
  }

  const funding = root.funding_subscription;
  const plan =
    funding && typeof funding === "object" && !Array.isArray(funding)
      ? formatPlan((funding as Record<string, unknown>).tier)
      : null;

  return {
    usage: {
      plan,
      remainingCredits,
      totalCredits,
      percentageRemaining:
        remainingCredits !== null && totalCredits !== null
          ? getRemainingPercentOrNull(remainingCredits, totalCredits)
          : null,
      nextCreditsAt,
    },
    error: null,
  };
}

export async function fetchRaycastUsage(cookieHeader: string): Promise<RaycastResult> {
  const { data, error } = await httpFetch({
    url: RAYCAST_CREDITS_API,
    headers: { ...RAYCAST_HEADERS, Cookie: cookieHeader },
    unauthorizedMessage:
      "Raycast website session expired. Sign in at raycast.com/settings and paste a fresh __raycast_session cookie in extension settings.",
  });
  if (error) return { usage: null, error };
  return parseRaycastCredits(data);
}
