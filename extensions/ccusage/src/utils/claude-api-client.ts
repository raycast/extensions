import { STATUS_CODES } from "node:http";
import { UsageLimitData, UsageLimitDataSchema } from "../types/usage-types";
import { UsageLimitsError } from "./usage-limits-error";

const fetchUsageLimitsResponse = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "claude-code/2.0.32",
        Accept: "application/json",
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      const status = response.status;
      const statusText = response.statusText || STATUS_CODES[status] || "Request Failed";

      throw new UsageLimitsError({
        kind: "fetch",
        error: new Error(`Claude API returned ${status} ${statusText} while fetching usage limits.`),
        status,
        statusText,
        responseText,
      });
    }

    return responseText;
  } catch (error) {
    if (error instanceof UsageLimitsError) {
      throw error;
    }

    throw new UsageLimitsError({
      kind: "fetch",
      error,
    });
  }
};

const parseUsageLimitsResponse = (responseText: string): UsageLimitData => {
  try {
    const data = JSON.parse(responseText);
    return UsageLimitDataSchema.parse(data);
  } catch (error) {
    throw new UsageLimitsError({ kind: "parse", error, responseText });
  }
};

export const fetchClaudeUsageLimits = async (accessToken: string): Promise<UsageLimitData> => {
  const responseText = await fetchUsageLimitsResponse(accessToken);
  return parseUsageLimitsResponse(responseText);
};
