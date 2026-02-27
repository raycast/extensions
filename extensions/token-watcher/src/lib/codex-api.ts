import type { CodexUsageResponse } from "./types";
import { getCodexAccessToken } from "./codex-credentials";

const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

async function doFetch(
  accessToken: string,
  accountId?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }
  return fetch(CODEX_USAGE_URL, { headers });
}

export async function fetchCodexUsage(): Promise<CodexUsageResponse> {
  const { accessToken, accountId } = await getCodexAccessToken();

  let response = await doFetch(accessToken, accountId);

  // Retry once with a fresh token (may have been refreshed externally)
  if (response.status === 401) {
    const fresh = await getCodexAccessToken();
    response = await doFetch(fresh.accessToken, fresh.accountId);
  }

  if (!response.ok) {
    throw new Error(
      `Codex Usage API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as CodexUsageResponse;
}
