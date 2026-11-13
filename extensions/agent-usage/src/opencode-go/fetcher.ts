import { httpFetch } from "../agents/http.ts";
import type { OpencodegoUsage, OpencodegoError, OpencodegoWindowUsage } from "./types.ts";

// Only the "opencode-go" auth entry is accepted: a bare "opencode" Zen key may not
// have Go entitlement, and would skip the not_configured state and fail with an opaque 403.
export const OPENCODEGO_OPENCODE_KEY = "opencode-go";

const OPENCODEGO_USAGE_API = "https://opencode.ai/zen/go/v1/usage";

const USAGE_WINDOWS = ["rolling", "weekly", "monthly"] as const;

function validateWindow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const window = value as Record<string, unknown>;
  return (
    typeof window.status === "string" &&
    typeof window.percent === "number" &&
    Number.isFinite(window.percent) &&
    (window.resetsAt === undefined || window.resetsAt === null || typeof window.resetsAt === "string")
  );
}

function normalizeWindow(value: unknown): OpencodegoWindowUsage {
  const window = value as Record<string, unknown>;
  return {
    status: window.status as string,
    percent: Math.min(100, Math.max(0, window.percent as number)),
    resetsAt: typeof window.resetsAt === "string" ? window.resetsAt : null,
  };
}

export function parseOpencodegoUsageResponse(data: unknown): {
  usage: OpencodegoUsage | null;
  error: OpencodegoError | null;
} {
  const usageContainer = data && typeof data === "object" ? (data as Record<string, unknown>).usage : null;
  if (!usageContainer || typeof usageContainer !== "object") {
    return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
  }

  const container = usageContainer as Record<string, unknown>;
  for (const window of USAGE_WINDOWS) {
    if (!validateWindow(container[window])) {
      return {
        usage: null,
        error: { type: "parse_error", message: `Missing or invalid usage data from OpenCode Zen API (${window})` },
      };
    }
  }

  return {
    usage: {
      rolling: normalizeWindow(container.rolling),
      weekly: normalizeWindow(container.weekly),
      monthly: normalizeWindow(container.monthly),
    },
    error: null,
  };
}

const OPENCODEGO_FORBIDDEN_MESSAGE =
  "OpenCode Go subscription not found for this API key. Please use the key of the account with a Go subscription in extension settings (Cmd+,).";

export async function fetchOpencodegoUsage(apiKey: string): Promise<{
  usage: OpencodegoUsage | null;
  error: OpencodegoError | null;
}> {
  const { data, error, status } = await httpFetch({
    url: OPENCODEGO_USAGE_API,
    token: apiKey.trim(),
    unauthorizedMessage: "OpenCode Zen API key invalid or expired. Please update it in extension settings (Cmd+,).",
    forbiddenMessage: OPENCODEGO_FORBIDDEN_MESSAGE,
  });

  if (error) {
    // A 403 means the key is valid but has no Go subscription — distinct from an expired key.
    if (error.type === "unauthorized" && status === 403) {
      return { usage: null, error: { type: "forbidden", message: OPENCODEGO_FORBIDDEN_MESSAGE } };
    }
    return { usage: null, error };
  }
  return parseOpencodegoUsageResponse(data);
}
