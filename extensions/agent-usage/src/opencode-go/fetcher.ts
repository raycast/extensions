import { httpFetch } from "../agents/http.ts";
import type { OpencodegoUsage, OpencodegoError, OpencodegoWindowUsage } from "./types.ts";

export const OPENCODEGO_OPENCODE_KEY = "opencode";

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

export async function fetchOpencodegoUsage(apiKey: string): Promise<{
  usage: OpencodegoUsage | null;
  error: OpencodegoError | null;
}> {
  const { data, error } = await httpFetch({
    url: OPENCODEGO_USAGE_API,
    token: apiKey.trim(),
    unauthorizedMessage: "OpenCode Zen API key invalid or expired. Please update it in extension settings (Cmd+,).",
  });

  if (error) return { usage: null, error };
  return parseOpencodegoUsageResponse(data);
}
