import {
  AccountProfile,
  RateLimits,
  RateLimitWindow,
  RawMoney,
  RawRateLimitWindow,
  RawUsage,
  Spend,
  Usage,
} from "../types";
import {
  DEFAULT_TIMEOUT_MS,
  OAUTH_BETA,
  USAGE_URL,
  USER_AGENT,
} from "../utils/constants";
import {
  fetchProfile,
  getStoredTokens,
  getValidAccessToken,
  saveStoredTokens,
} from "./oauth";

export function toMajorUnits(
  money: RawMoney | null | undefined,
): number | null {
  if (
    !money ||
    typeof money !== "object" ||
    typeof money.amount_minor !== "number" ||
    typeof money.exponent !== "number" ||
    !Number.isFinite(money.amount_minor) ||
    !Number.isFinite(money.exponent) ||
    money.exponent < 0 ||
    money.exponent > 10 ||
    !Number.isInteger(money.exponent)
  ) {
    return null;
  }
  const result = money.amount_minor / 10 ** money.exponent;
  return Number.isFinite(result) ? result : null;
}

export function parseResetsAt(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw < 1e11 ? Math.round(raw * 1000) : Math.round(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric < 1e11
          ? Math.round(numeric * 1000)
          : Math.round(numeric);
      }
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }
  return null;
}

export function parseWindow(
  raw: RawRateLimitWindow | null | undefined,
): RateLimitWindow | null {
  if (
    !raw ||
    raw.utilization === null ||
    raw.utilization === undefined ||
    !Number.isFinite(raw.utilization)
  ) {
    return null;
  }
  return {
    utilization: Math.max(0, Math.min(100, raw.utilization)),
    resetsAt: parseResetsAt(raw.resets_at),
  };
}

function getDefaultMonthlyResetTime(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0);
}

export type FetchUsageResult =
  | { success: true; usage: Usage }
  | {
      success: false;
      errorType:
        "unauthorized" | "network" | "rate_limit" | "server_error" | "no_token";
    };

export async function fetchUsage(): Promise<FetchUsageResult> {
  try {
    const token = await getValidAccessToken();
    if (!token) {
      return { success: false, errorType: "no_token" };
    }

    const response = await fetch(USAGE_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Authorization: `Bearer ${token}`,
        "anthropic-beta": OAUTH_BETA,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (response.status === 401) {
      return { success: false, errorType: "unauthorized" };
    }
    if (response.status === 429) {
      return { success: false, errorType: "rate_limit" };
    }
    if (!response.ok) {
      return {
        success: false,
        errorType: response.status >= 500 ? "server_error" : "network",
      };
    }

    const raw = (await response.json()) as RawUsage;
    const stored = await getStoredTokens();
    let profile: AccountProfile | null = stored?.profile ?? null;

    if (stored && stored.profile === undefined) {
      try {
        profile = await fetchProfile(token);
        if (profile) {
          await saveStoredTokens({
            ...stored,
            plan: profile.plan,
            profile,
          });
        }
      } catch {
        // Ignore profile fetch failure during usage refresh
      }
    }

    let spend: Spend | null = null;
    if (raw.spend && raw.spend.enabled !== false) {
      const usedAmount = toMajorUnits(raw.spend.used) ?? 0;
      const limitAmount = toMajorUnits(raw.spend.limit);
      const rawResetsAt = raw.spend.resets_at ?? raw.extra_usage?.resets_at;
      const resetsAt =
        parseResetsAt(rawResetsAt) ?? getDefaultMonthlyResetTime();

      spend = {
        usedAmount,
        limitAmount,
        currency: raw.spend.used?.currency ?? "USD",
        percent:
          limitAmount && limitAmount > 0
            ? (usedAmount / limitAmount) * 100
            : (raw.spend.percent ?? 0),
        resetsAt,
      };
    } else if (
      raw.extra_usage &&
      raw.extra_usage.is_enabled &&
      raw.extra_usage.monthly_limit !== null &&
      raw.extra_usage.monthly_limit !== undefined
    ) {
      const usedAmount = (raw.extra_usage.used_credits ?? 0) / 100;
      const limitAmount = raw.extra_usage.monthly_limit / 100;
      const rawResetsAt = raw.extra_usage.resets_at;
      const resetsAt =
        parseResetsAt(rawResetsAt) ?? getDefaultMonthlyResetTime();

      spend = {
        usedAmount,
        limitAmount,
        currency: raw.extra_usage.currency ?? "USD",
        percent:
          raw.extra_usage.utilization ??
          (limitAmount > 0 ? (usedAmount / limitAmount) * 100 : 0),
        resetsAt,
      };
    }

    const rateLimits: RateLimits = {
      fiveHour: parseWindow(raw.five_hour),
      sevenDay: parseWindow(raw.seven_day),
      sevenDaySonnet: parseWindow(raw.seven_day_sonnet),
    };

    return {
      success: true,
      usage: {
        spend,
        rateLimits,
        plan: profile?.plan ?? stored?.plan ?? null,
        organization: profile?.organizationName ?? null,
        rateLimitTier: profile?.rateLimitTier ?? null,
        email: profile?.email ?? null,
        fetchedAt: Date.now(),
      },
    };
  } catch {
    return { success: false, errorType: "network" };
  }
}
