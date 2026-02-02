import { UsageLimitDataSchema } from "../types/usage-types";
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

  if (!token) {
    throw new Error(
      "Claude Code credentials not found in keychain. Please authenticate Claude Code first using 'claude-code auth' or similar command.",
    );
  }

  const limitData = await fetchClaudeUsageLimits(token);

  if (!limitData) {
    throw new Error(
      "Failed to fetch usage limits from Claude API. Please check your network connection and authentication status.",
    );
  }

  const parseResult = UsageLimitDataSchema.safeParse(limitData);

  if (!parseResult.success) {
    throw new Error(`Invalid usage limit data: ${parseResult.error.message}`);
  }

  const data = parseResult.data;

  const formatResetTime = (isoString: string): string => {
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
      utilization: Math.round(data.five_hour.utilization * 10) / 10,
      resetsAt: formatResetTime(data.five_hour.resets_at),
      ...(input?.includeRawTimestamps && { rawTimestamp: data.five_hour.resets_at }),
    },
    sevenDay: {
      utilization: Math.round(data.seven_day.utilization * 10) / 10,
      resetsAt: formatResetTime(data.seven_day.resets_at),
      ...(input?.includeRawTimestamps && { rawTimestamp: data.seven_day.resets_at }),
    },
  };
}
