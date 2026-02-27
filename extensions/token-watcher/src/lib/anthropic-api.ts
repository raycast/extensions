import fetch from "node-fetch";
import type { UsageApiResponse } from "./types";
import { USAGE_API_URL } from "./constants";
import { getValidAccessToken } from "./credentials";

export async function fetchRateLimits(): Promise<UsageApiResponse> {
  const token = getValidAccessToken();

  let response = await fetch(USAGE_API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  });

  // Retry once with a fresh token read (CLI may have refreshed)
  if (response.status === 401) {
    const freshToken = getValidAccessToken();
    response = await fetch(USAGE_API_URL, {
      headers: {
        Authorization: `Bearer ${freshToken}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
    });
  }

  if (!response.ok) {
    throw new Error(
      `Usage API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as UsageApiResponse;
}
