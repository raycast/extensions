import { KimiUsage, KimiError } from "./types";
import { httpFetch } from "../agents/http";

export const KIMI_OPENCODE_KEY = "kimi-for-coding";

const KIMI_USAGE_API = "https://api.kimi.com/coding/v1/usages";

// --- API response interfaces ---

interface KimiApiUsageDetail {
  limit: number | string;
  used: number | string;
  remaining: number | string;
  resetTime: string;
}

interface KimiApiResponse {
  usage?: KimiApiUsageDetail;
  limits?: Array<{
    window: { duration: number; timeUnit: string };
    detail: KimiApiUsageDetail;
  }>;
}

// --- Helpers ---

function toInt(value: number | string): number {
  return typeof value === "number" ? value : parseInt(value, 10);
}

function toWindowMinutes(duration: number, timeUnit: string): number {
  if (timeUnit === "TIME_UNIT_HOUR") return duration * 60;
  if (timeUnit === "TIME_UNIT_DAY") return duration * 1440;
  return duration; // TIME_UNIT_MINUTE or unknown
}

// --- Parser ---

function parseKimiApiResponse(data: unknown): { usage: KimiUsage | null; error: KimiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as KimiApiResponse;

    if (!response.usage) {
      return { usage: null, error: { type: "parse_error", message: "No usage field in API response" } };
    }

    const u = response.usage;
    const firstLimit = response.limits?.[0];

    const usage: KimiUsage = {
      limit: toInt(u.limit),
      used: toInt(u.used),
      remaining: toInt(u.remaining),
      resetTime: u.resetTime,
      rateLimit: firstLimit
        ? {
            windowMinutes: toWindowMinutes(firstLimit.window.duration, firstLimit.window.timeUnit),
            limit: toInt(firstLimit.detail.limit),
            used: toInt(firstLimit.detail.used),
            remaining: toInt(firstLimit.detail.remaining),
            resetTime: firstLimit.detail.resetTime,
          }
        : undefined,
    };

    return { usage, error: null };
  } catch (err) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: err instanceof Error ? err.message : "Failed to parse API response",
      },
    };
  }
}

// --- Core fetcher ---

export async function fetchKimiUsage(token: string): Promise<{ usage: KimiUsage | null; error: KimiError | null }> {
  const { data, error } = await httpFetch({
    url: KIMI_USAGE_API,
    method: "GET",
    token,
    headers: { Accept: "application/json" },
  });
  if (error) return { usage: null, error };
  return parseKimiApiResponse(data);
}
