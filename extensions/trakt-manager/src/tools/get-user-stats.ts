import { CompactUserStats, toCompactUserStats } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Optional username or user slug to get stats for. Defaults to "me" for your authenticated account.
   */
  username?: string;
};

type Output = CompactUserStats;

/**
 * Get comprehensive lifetime viewing and rating statistics for your authenticated Trakt account,
 * including total watch time (hours/days), movie and episode counts, and rating breakdown.
 */
export default async function tool(input: Input): Promise<Output> {
  const userId = input.username?.trim() || "me";
  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.getUserStats({
        params: { id: userId },
        fetchOptions: { signal },
      }),
    "Failed to fetch user Trakt statistics",
  );

  return toCompactUserStats(res.body);
}
