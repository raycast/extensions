import { DroidUsage, DroidUsageTier, DroidError } from "./types";
import { httpFetch } from "../agents/http";
import { createTokenBasedHook } from "../agents/hooks";

const DROID_USAGE_API = "https://api.factory.ai/api/organization/subscription/schedule";

const DROID_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchDroidUsage(token: string): Promise<{ usage: DroidUsage | null; error: DroidError | null }> {
  const { data, error } = await httpFetch({ url: DROID_USAGE_API, token, headers: DROID_HEADERS });
  if (error) return { usage: null, error };
  return parseDroidApiResponse(data);
}

function parseDroidApiResponse(data: unknown): { usage: DroidUsage | null; error: DroidError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as {
      usage?: {
        startDate?: number;
        endDate?: number;
        standard?: Partial<DroidUsageTier>;
        premium?: Partial<DroidUsageTier>;
      };
    };

    const usage = response.usage;

    if (!usage) {
      return { usage: null, error: { type: "parse_error", message: "Missing usage data in API response" } };
    }

    const standard: DroidUsageTier = {
      userTokens: usage.standard?.userTokens ?? 0,
      orgTotalTokensUsed: usage.standard?.orgTotalTokensUsed ?? 0,
      orgOverageUsed: usage.standard?.orgOverageUsed ?? 0,
      basicAllowance: usage.standard?.basicAllowance ?? 0,
      totalAllowance: usage.standard?.totalAllowance ?? 0,
      orgOverageLimit: usage.standard?.orgOverageLimit ?? 0,
      usedRatio: usage.standard?.usedRatio ?? 0,
    };

    const premium: DroidUsageTier = {
      userTokens: usage.premium?.userTokens ?? 0,
      orgTotalTokensUsed: usage.premium?.orgTotalTokensUsed ?? 0,
      orgOverageUsed: usage.premium?.orgOverageUsed ?? 0,
      basicAllowance: usage.premium?.basicAllowance ?? 0,
      totalAllowance: usage.premium?.totalAllowance ?? 0,
      orgOverageLimit: usage.premium?.orgOverageLimit ?? 0,
      usedRatio: usage.premium?.usedRatio ?? 0,
    };

    return {
      usage: { startDate: usage.startDate ?? 0, endDate: usage.endDate ?? 0, standard, premium },
      error: null,
    };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}

export const useDroidUsage = createTokenBasedHook<DroidUsage, DroidError>({
  preferenceKey: "droidAuthToken",
  agentName: "Droid",
  fetcher: fetchDroidUsage,
});
