import { UsageLimitData, UsageLimitDataSchema } from "../types/usage-types";

export const fetchClaudeUsageLimits = async (accessToken: string): Promise<UsageLimitData | null> => {
  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "claude-code/2.0.32",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = UsageLimitDataSchema.safeParse(data);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
