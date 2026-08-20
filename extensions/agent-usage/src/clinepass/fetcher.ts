import { parseDate } from "../agents/format.ts";
import { httpFetch } from "../agents/http.ts";
import { formatClineApiToken, refreshClineCredential } from "./auth.ts";
import type {
  ClineBalance,
  ClinePassCredential,
  ClinePassError,
  ClinePassLimit,
  ClinePassUsage,
  ClineProfile,
  ClineUsageLimits,
} from "./types.ts";

const CLINE_API = "https://api.cline.bot/api/v1";
const FIVE_HOUR_MAX_RESET_SECONDS = 5 * 60 * 60;
const WEEKLY_MAX_RESET_SECONDS = 7 * 24 * 60 * 60;
const MONTHLY_MAX_RESET_SECONDS = 30 * 24 * 60 * 60;

interface ApiEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseEnvelope(data: unknown, label: string): { data: unknown; error: ClinePassError | null } {
  const envelope = asRecord(data) as ApiEnvelope | null;
  if (!envelope || envelope.success !== true || envelope.data == null) {
    return {
      data: null,
      error: { type: "parse_error", message: envelope?.error || `Cline returned an invalid ${label} response.` },
    };
  }
  return { data: envelope.data, error: null };
}

function toLimit(limits: ClineUsageLimits["limits"], type: string, maxResetSeconds: number): ClinePassLimit | null {
  const limit = limits.find((entry) => entry.type === type);
  if (!limit || typeof limit.percentUsed !== "number" || !Number.isFinite(limit.percentUsed)) return null;
  const resetsAt =
    typeof limit.resetsAt === "string" && limit.resetsAt && parseDate(limit.resetsAt) ? limit.resetsAt : undefined;
  return {
    percentageRemaining: Math.min(100, Math.max(0, 100 - limit.percentUsed)),
    ...(resetsAt ? { resetsAt } : {}),
    maxResetSeconds,
  };
}

export function parseClinePassResponses(
  profileData: unknown,
  balanceData: unknown,
  limitsData: unknown,
  requestedUserId: string,
): { usage: ClinePassUsage | null; error: ClinePassError | null } {
  const profile = asRecord(profileData) as unknown as ClineProfile | null;
  const balance = asRecord(balanceData) as unknown as ClineBalance | null;
  const limitsRecord = asRecord(limitsData);
  const limits = Array.isArray(limitsRecord?.limits) ? (limitsRecord.limits as ClineUsageLimits["limits"]) : null;

  if (!profile || typeof profile.id !== "string") {
    return { usage: null, error: { type: "parse_error", message: "Cline returned an invalid profile response." } };
  }
  if (profile.id !== requestedUserId) {
    return {
      usage: null,
      error: {
        type: "unauthorized",
        message: `The Cline credential belongs to ${profile.id}, not the configured user ${requestedUserId}.`,
      },
    };
  }
  if (!balance || balance.userId !== requestedUserId || typeof balance.balance !== "number") {
    return { usage: null, error: { type: "parse_error", message: "Cline returned an invalid credit balance." } };
  }
  if (!limits) {
    return { usage: null, error: { type: "parse_error", message: "Cline returned invalid usage limits." } };
  }

  const fiveHourLimit = toLimit(limits, "five_hour", FIVE_HOUR_MAX_RESET_SECONDS);
  const weeklyLimit = toLimit(limits, "weekly", WEEKLY_MAX_RESET_SECONDS);
  const monthlyLimit = toLimit(limits, "monthly", MONTHLY_MAX_RESET_SECONDS);
  const missing = [
    ["5h", fiveHourLimit],
    ["weekly", weeklyLimit],
    ["monthly", monthlyLimit],
  ]
    .filter(([, limit]) => !limit)
    .map(([name]) => name);
  if (missing.length > 0) {
    return {
      usage: null,
      error: { type: "parse_error", message: `Cline did not return the ${missing.join(", ")} usage limit(s).` },
    };
  }

  return {
    usage: {
      account: profile.displayName?.trim() || profile.email?.trim() || requestedUserId,
      userId: requestedUserId,
      fiveHourLimit: fiveHourLimit as ClinePassLimit,
      weeklyLimit: weeklyLimit as ClinePassLimit,
      monthlyLimit: monthlyLimit as ClinePassLimit,
      credits: { balance: balance.balance, balanceUsd: balance.balance / 1_000_000 },
    },
    error: null,
  };
}

async function fetchEndpoint(credential: ClinePassCredential, url: string, label: string) {
  const result = await httpFetch({
    url,
    token: formatClineApiToken(credential.token),
    headers: { Accept: "application/json" },
    unauthorizedMessage: "Cline credentials expired or are invalid. Sign in to Cline again or update this account.",
  });
  if (result.error) return { data: null, error: result.error as ClinePassError };
  return parseEnvelope(result.data, label);
}

type EndpointResult = Awaited<ReturnType<typeof fetchEndpoint>>;

interface FetchClinePassOptions {
  request?: (credential: ClinePassCredential, url: string, label: string) => Promise<EndpointResult>;
  readFileCredentials?: () => ClinePassCredential[] | Promise<ClinePassCredential[]>;
  refreshCredential?: typeof refreshClineCredential;
  saveLocalCredential?: (credential: ClinePassCredential) => Promise<void>;
  clearLocalCredential?: () => Promise<void>;
}

async function fetchWithCredential(
  credential: ClinePassCredential,
  request: NonNullable<FetchClinePassOptions["request"]>,
): Promise<{ usage: ClinePassUsage | null; error: ClinePassError | null }> {
  const profileResult = await request(credential, `${CLINE_API}/users/me`, "profile");
  if (profileResult.error) return { usage: null, error: profileResult.error };

  const [balanceResult, limitsResult] = await Promise.all([
    request(credential, `${CLINE_API}/users/${encodeURIComponent(credential.userId)}/balance`, "balance"),
    request(credential, `${CLINE_API}/users/me/plan/usage-limits`, "usage limits"),
  ]);
  if (balanceResult.error) return { usage: null, error: balanceResult.error };
  if (limitsResult.error) return { usage: null, error: limitsResult.error };
  return parseClinePassResponses(profileResult.data, balanceResult.data, limitsResult.data, credential.userId);
}

export async function fetchClinePassUsage(
  credential: ClinePassCredential,
  options: FetchClinePassOptions = {},
): Promise<{ usage: ClinePassUsage | null; error: ClinePassError | null }> {
  if (credential.validationError) {
    return { usage: null, error: { type: "not_configured", message: credential.validationError } };
  }

  const request = options.request ?? fetchEndpoint;
  const firstResult = await fetchWithCredential(credential, request);
  if (firstResult.error?.type !== "unauthorized") return firstResult;
  if (credential.source === "manual") return firstResult;

  let fileCredentials: ClinePassCredential[];
  try {
    fileCredentials = options.readFileCredentials ? await options.readFileCredentials() : [];
  } catch (error) {
    return {
      usage: null,
      error: {
        type: "unknown",
        message: `Unable to reread Cline credentials: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }

  const attempted = new Set([`${credential.userId}\n${credential.token}`]);
  let lastUnauthorized: ClinePassError = firstResult.error;
  for (const fileCredential of fileCredentials) {
    const key = `${fileCredential.userId}\n${fileCredential.token}`;
    if (attempted.has(key)) continue;
    attempted.add(key);
    const result = await fetchWithCredential(fileCredential, request);
    if (!result.error) {
      if (credential.source === "local" && options.clearLocalCredential) {
        try {
          await options.clearLocalCredential();
        } catch (error) {
          return {
            usage: null,
            error: {
              type: "unknown",
              message: `Cline file credentials work, but Agent Usage could not clear its stale locally stored token: ${error instanceof Error ? error.message : String(error)}`,
            },
          };
        }
      }
      return result;
    }
    if (result.error.type !== "unauthorized") return result;
    lastUnauthorized = result.error;
  }

  const refreshCredential = options.refreshCredential ?? refreshClineCredential;
  const refreshCandidates = [...fileCredentials, credential];
  const attemptedRefreshTokens = new Set<string>();
  for (const refreshCandidate of refreshCandidates) {
    if (!refreshCandidate.refreshToken || attemptedRefreshTokens.has(refreshCandidate.refreshToken)) continue;
    attemptedRefreshTokens.add(refreshCandidate.refreshToken);
    const refreshed = await refreshCredential(refreshCandidate);
    if (!refreshed.credential) {
      if (refreshed.error) lastUnauthorized = refreshed.error;
      continue;
    }

    try {
      await options.saveLocalCredential?.(refreshed.credential);
    } catch (error) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `Cline credentials were refreshed, but Agent Usage could not store them locally: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }

    const result = await fetchWithCredential(refreshed.credential, request);
    if (!result.error) return result;
    if (result.error.type !== "unauthorized") return result;
    lastUnauthorized = result.error;
    try {
      await options.clearLocalCredential?.();
    } catch {
      // Keep the authentication error, which is the actionable failure.
    }
  }

  return { usage: null, error: lastUnauthorized };
}
