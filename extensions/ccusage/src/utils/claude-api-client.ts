import { UsageLimitData, UsageLimitDataSchema } from "../types/usage-types";

export type UsageLimitsResult =
  | { status: "ok"; data: UsageLimitData }
  | { status: "rate_limited"; retryAfterMs: number | null }
  | { status: "error"; message: string };

const parseRetryAfter = (headerValue: string | null): number | null => {
  if (!headerValue) return null;

  const trimmed = headerValue.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, parseInt(trimmed, 10) * 1000);
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
};

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
      return { status: "rate_limited", retryAfterMs: parseRetryAfter(response.headers.get("retry-after")) };
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
