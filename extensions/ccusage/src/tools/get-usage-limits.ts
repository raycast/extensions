import { getClaudeAccessToken } from "../utils/keychain-access";
import { fetchClaudeUsageLimits } from "../utils/claude-api-client";

type Input = {
  /** Include raw reset timestamps in ISO format */
  includeRawTimestamps?: boolean;
};

/**
 * Get Claude API usage limits including 5-hour and 7-day utilization percentages
 * @param input - Optional input parameters for formatting
 * @returns Usage limit data with utilization percentages and reset times
 * @throws Error when credentials are not found or API returns invalid data
 */
export default async function getUsageLimits(input?: Input): Promise<{
  fiveHour: {
    utilization: number;
    resetsAt: string;
    rawTimestamp?: string;
  };
  sevenDay: {
    utilization: number;
    resetsAt: string;
    rawTimestamp?: string;
  };
}> {
  const token = await getClaudeAccessToken();
  const isUsageLimitsAvailable = typeof token === "string" && token.trim().length > 0;

  if (!isUsageLimitsAvailable) {
    throw new Error("Usage limits require Claude OAuth authentication in Claude Code.");
  }

  const usageLimitsData = await fetchClaudeUsageLimits(token);

  const formatResetTime = (isoString: string | null): string => {
    if (!isoString) {
      return "N/A";
    }

    const resetTime = new Date(isoString);
    const now = new Date();
    const diffMs = resetTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Resetting now";
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return {
    fiveHour: {
      utilization: Math.round(usageLimitsData.five_hour.utilization * 10) / 10,
      resetsAt: formatResetTime(usageLimitsData.five_hour.resets_at),
      ...(input?.includeRawTimestamps && { rawTimestamp: usageLimitsData.five_hour.resets_at ?? undefined }),
    },
    sevenDay: {
      utilization: Math.round(usageLimitsData.seven_day.utilization * 10) / 10,
      resetsAt: formatResetTime(usageLimitsData.seven_day.resets_at),
      ...(input?.includeRawTimestamps && { rawTimestamp: usageLimitsData.seven_day.resets_at ?? undefined }),
    },
  };
}
