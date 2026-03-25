import { UsageLimitData, UsageLimitDataSchema } from "../types/usage-types";

export type UsageLimitsResult =
  | { status: "ok"; data: UsageLimitData }
  | { status: "rate_limited" }
  | { status: "error"; message: string };

export const fetchClaudeUsageLimits = async (accessToken: string): Promise<UsageLimitsResult> => {
  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "claude-code/2.0.32",
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      return { status: "rate_limited" };
    }

    if (!response.ok) {
      return { status: "error", message: `API returned ${response.status}` };
    }

    const data = await response.json();
    const result = UsageLimitDataSchema.safeParse(data);

    return result.success
      ? { status: "ok", data: result.data }
      : { status: "error", message: "Unexpected API response format" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Network error" };
  }
};
