import { KimiUsage, KimiError } from "./types";
import { httpFetch } from "../agents/http";
import { createTokenBasedHook } from "../agents/hooks";

const KIMI_USAGE_API = "https://www.kimi.com/apiv2/kimi.gateway.billing.v1.BillingService/GetUsages";

const KIMI_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchKimiUsage(token: string): Promise<{ usage: KimiUsage | null; error: KimiError | null }> {
  const { data, error } = await httpFetch({
    url: KIMI_USAGE_API,
    method: "POST",
    token,
    headers: KIMI_HEADERS,
    body: JSON.stringify({ scope: ["FEATURE_CODING"] }),
  });
  if (error) return { usage: null, error };
  return parseKimiApiResponse(data);
}

interface KimiApiUsage {
  scope: string;
  detail: {
    limit: string;
    used: string;
    remaining: string;
    resetTime: string;
  };
  limits?: Array<{
    window: {
      duration: number;
      timeUnit: string;
    };
    detail: {
      limit: string;
      used: string;
      remaining: string;
      resetTime: string;
    };
  }>;
}

interface KimiApiResponse {
  usages?: KimiApiUsage[];
}

function parseKimiApiResponse(data: unknown): { usage: KimiUsage | null; error: KimiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as KimiApiResponse;
    const codingUsage = response.usages?.find((u) => u.scope === "FEATURE_CODING");

    if (!codingUsage) {
      return { usage: null, error: { type: "parse_error", message: "No coding usage data found in API response" } };
    }

    const weeklyDetail = codingUsage.detail;
    const rateLimitData = codingUsage.limits?.[0];

    if (!rateLimitData) {
      return { usage: null, error: { type: "parse_error", message: "No rate limit data found in API response" } };
    }

    const usage: KimiUsage = {
      weeklyUsage: {
        limit: parseInt(weeklyDetail.limit, 10),
        used: parseInt(weeklyDetail.used, 10),
        remaining: parseInt(weeklyDetail.remaining, 10),
        resetTime: weeklyDetail.resetTime,
      },
      rateLimit: {
        windowMinutes: rateLimitData.window.duration,
        limit: parseInt(rateLimitData.detail.limit, 10),
        used: parseInt(rateLimitData.detail.used, 10),
        remaining: parseInt(rateLimitData.detail.remaining, 10),
        resetTime: rateLimitData.detail.resetTime,
      },
    };

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}

export const useKimiUsage = createTokenBasedHook<KimiUsage, KimiError>({
  preferenceKey: "kimiAuthToken",
  agentName: "Kimi",
  fetcher: fetchKimiUsage,
});
