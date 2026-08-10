import { ZaiUsage, ZaiError, ZaiLimitEntry, ZaiUsageDetail } from "./types";

const ZAI_UNIT_DAYS = 1;
const ZAI_WINDOW_DAILY = 1;
const ZAI_WINDOW_WEEKLY = 7;

interface ZaiApiLimitEntry {
  type: string;
  unit: number;
  number: number;
  usage: number | null;
  currentValue: number | null;
  remaining: number | null;
  percentage: number;
  usageDetails?: Array<{ modelCode: string; usage: number }> | null;
  nextResetTime: number | null;
}

interface ZaiApiResponse {
  code: number;
  msg: string;
  success: boolean;
  data?: {
    limits?: ZaiApiLimitEntry[];
    planName?: string;
    plan?: string;
    plan_type?: string;
    packageName?: string;
  };
}

function unitToLabel(unit: number): string {
  switch (unit) {
    case 1:
      return "days";
    case 3:
      return "hours";
    case 5:
      return "minutes";
    default:
      return "units";
  }
}

function buildWindowDescription(unit: number, num: number): string {
  return `${num} ${unitToLabel(unit)}`;
}

function parseLimitEntry(entry: ZaiApiLimitEntry): ZaiLimitEntry {
  const usageDetails: ZaiUsageDetail[] = (entry.usageDetails ?? []).map((d) => ({
    modelCode: d.modelCode,
    usage: d.usage,
  }));

  const resetTime = entry.nextResetTime != null ? new Date(entry.nextResetTime).toISOString() : null;

  return {
    type: entry.type as "TOKENS_LIMIT" | "TIME_LIMIT",
    windowDescription: buildWindowDescription(entry.unit, entry.number),
    usage: entry.usage ?? null,
    currentValue: entry.currentValue ?? null,
    remaining: entry.remaining ?? null,
    percentage: entry.percentage,
    usageDetails,
    resetTime,
  };
}

function selectDailyAndWeekly(entries: ZaiApiLimitEntry[]): {
  daily: ZaiApiLimitEntry | null;
  weekly: ZaiApiLimitEntry | null;
} {
  const daily = entries.find((l) => l.number === ZAI_WINDOW_DAILY && l.unit === ZAI_UNIT_DAYS) ?? entries[0] ?? null;
  const weeklyCandidate =
    entries.find((l) => l.number === ZAI_WINDOW_WEEKLY && l.unit === ZAI_UNIT_DAYS) ??
    entries.find((l) => l !== daily) ??
    null;
  // A single 7-day-only response makes both finds resolve to the same object;
  // don't surface the daily entry a second time as the weekly one.
  const weekly = weeklyCandidate !== daily ? weeklyCandidate : null;
  return { daily, weekly };
}

export function parseZaiApiResponse(data: unknown): { usage: ZaiUsage | null; error: ZaiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as ZaiApiResponse;

    if (response.success !== true || response.code !== 200) {
      return { usage: null, error: { type: "api_error", message: response.msg || "API returned an error" } };
    }

    const limits = response.data?.limits;

    if (!limits || !Array.isArray(limits)) {
      return { usage: null, error: { type: "parse_error", message: "No limits data found in API response" } };
    }

    const tokenLimits = limits.filter((l) => l.type === "TOKENS_LIMIT");
    const timeLimits = limits.filter((l) => l.type === "TIME_LIMIT");

    const { daily: tokenEntry, weekly: weeklyTokenEntry } = selectDailyAndWeekly(tokenLimits);
    const { daily: timeEntry, weekly: weeklyTimeEntry } = selectDailyAndWeekly(timeLimits);

    const planName =
      response.data?.planName ?? response.data?.plan ?? response.data?.plan_type ?? response.data?.packageName ?? null;

    const usage: ZaiUsage = {
      tokenLimit: tokenEntry ? parseLimitEntry(tokenEntry) : null,
      weeklyTokenLimit: weeklyTokenEntry ? parseLimitEntry(weeklyTokenEntry) : null,
      timeLimit: timeEntry ? parseLimitEntry(timeEntry) : null,
      weeklyTimeLimit: weeklyTimeEntry ? parseLimitEntry(weeklyTimeEntry) : null,
      planName,
    };

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse API response" },
    };
  }
}
