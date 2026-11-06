import { fetchClaudeUsageLimits } from "../utils/claude-api-client";
import { getLimitRows } from "../utils/limit-rows";
import { formatResetTime } from "../utils/usage-limits-formatter";
import { LimitWindow } from "../types/usage-types";

type Input = {
  /** Include raw reset timestamps in ISO format */
  includeRawTimestamps?: boolean;
};

type LimitWindowSummary = {
  utilization: number;
  resetsAt: string;
  rawTimestamp?: string;
};

/**
 * Get Claude API usage limits including the 5-hour and 7-day totals and any per-model windows. A total the plan lacks is null.
 * @param input - Optional input parameters for formatting
 * @returns Usage limit data with utilization percentages and reset times
 * @throws Error when credentials are not found or API returns invalid data
 */
export default async function getUsageLimits(input?: Input): Promise<{
  fiveHour: LimitWindowSummary | null;
  sevenDay: LimitWindowSummary | null;
  scopedLimits?: Array<LimitWindowSummary & { label: string; period: string }>;
}> {
  const result = await fetchClaudeUsageLimits();

  if (result.status === "rate_limited") {
    throw new Error("Rate limited by Anthropic API. Please try again later.");
  }
  if (result.status === "error") {
    throw new Error(result.message);
  }

  const usageLimitsData = result.data;

  const resetsBy = (isoString: string | null): string => (isoString ? formatResetTime(isoString) : "N/A");

  const scopedLimits = getLimitRows(usageLimitsData).flatMap((row) =>
    row.period === null
      ? []
      : [
          {
            label: row.label,
            period: row.period,
            utilization: row.utilization,
            resetsAt: resetsBy(row.resets_at),
            ...(input?.includeRawTimestamps && { rawTimestamp: row.resets_at ?? undefined }),
          },
        ],
  );

  const formatWindow = (window: LimitWindow | null | undefined): LimitWindowSummary | null =>
    window
      ? {
          utilization: Math.round(window.utilization * 10) / 10,
          resetsAt: resetsBy(window.resets_at),
          ...(input?.includeRawTimestamps && { rawTimestamp: window.resets_at ?? undefined }),
        }
      : null;

  return {
    fiveHour: formatWindow(usageLimitsData.five_hour),
    sevenDay: formatWindow(usageLimitsData.seven_day),
    ...(scopedLimits.length > 0 && { scopedLimits }),
  };
}
