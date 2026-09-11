import { httpFetch } from "../agents/http.ts";
import type { AihubmixError, AihubmixUsage } from "./types.ts";

const AIHUBMIX_SELF_API = "https://aihubmix.com/api/user/self";
const QUOTA_PER_USD = 500_000;
const UNAUTHORIZED_MESSAGE =
  "AIHubMix Access Key expired or invalid. Copy a new Access Key from https://console.aihubmix.com/setting.";

export function parseAihubmixSelf(data: unknown): { usage: AihubmixUsage | null; error: AihubmixError | null } {
  if (!data || typeof data !== "object") {
    return { usage: null, error: { type: "parse_error", message: "Invalid AIHubMix API response format" } };
  }

  const response = data as { success?: unknown; message?: unknown; data?: unknown };
  if (response.success !== true || !response.data || typeof response.data !== "object") {
    const message = typeof response.message === "string" && response.message ? response.message : UNAUTHORIZED_MESSAGE;
    return { usage: null, error: { type: "unauthorized", message } };
  }

  const account = response.data as {
    quota?: unknown;
    used_quota?: unknown;
    request_count?: unknown;
    username?: unknown;
    display_name?: unknown;
  };
  if (
    typeof account.quota !== "number" ||
    typeof account.used_quota !== "number" ||
    typeof account.request_count !== "number"
  ) {
    return { usage: null, error: { type: "parse_error", message: "Missing AIHubMix account quota" } };
  }

  return {
    usage: {
      remainingUsd: account.quota / QUOTA_PER_USD,
      usedUsd: account.used_quota / QUOTA_PER_USD,
      requestCount: account.request_count,
      username: typeof account.display_name === "string" ? account.display_name : String(account.username),
    },
    error: null,
  };
}

export async function fetchAihubmixUsage(
  accessKey: string,
): Promise<{ usage: AihubmixUsage | null; error: AihubmixError | null }> {
  const { data, error } = await httpFetch({
    url: AIHUBMIX_SELF_API,
    headers: { Authorization: accessKey, "Content-Type": "application/json" },
    unauthorizedMessage: UNAUTHORIZED_MESSAGE,
  });
  if (error) return { usage: null, error };
  return parseAihubmixSelf(data);
}
