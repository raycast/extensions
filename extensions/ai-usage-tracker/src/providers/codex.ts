import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ProviderUsage, UsageWindow } from "../types";

const AUTH_FILE_PATHS = [
  join(homedir(), ".codex", "auth.json"),
  process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "auth.json") : "",
].filter(Boolean);

const USAGE_API = "https://chatgpt.com/backend-api/wham/usage";

interface CodexAuthFile {
  tokens?: {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    account_id?: string;
  };
  OPENAI_API_KEY?: string;
}

interface RateLimitWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

interface RateLimitInfo {
  allowed: boolean;
  limit_reached: boolean;
  primary_window?: RateLimitWindow;
  secondary_window?: RateLimitWindow | null;
}

interface CreditsInfo {
  has_credits: boolean;
  unlimited: boolean;
  balance: string;
  approx_local_messages?: [number, number];
  approx_cloud_messages?: [number, number];
}

interface CodexUsageResponse {
  plan_type?: string;
  rate_limit?: RateLimitInfo;
  code_review_rate_limit?: RateLimitInfo;
  credits?: CreditsInfo;
}

function loadToken(): string | null {
  for (const path of AUTH_FILE_PATHS) {
    if (!path || !existsSync(path)) continue;

    try {
      const content = readFileSync(path, "utf-8");
      const parsed: CodexAuthFile = JSON.parse(content);
      if (parsed.tokens?.access_token) {
        return parsed.tokens.access_token;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchUsage(token: string): Promise<CodexUsageResponse | null> {
  try {
    const response = await fetch(USAGE_API, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Raycast-AI-Usage-Tracker",
      },
    });

    if (!response.ok) {
      console.error(`Codex API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Codex fetch error:", error);
    return null;
  }
}

function parseUsageResponse(data: CodexUsageResponse): UsageWindow[] {
  const windows: UsageWindow[] = [];
  const rateLimit = data.rate_limit;

  if (rateLimit?.primary_window) {
    const pw = rateLimit.primary_window;
    const resetsAt = new Date(pw.reset_at * 1000);

    windows.push({
      type: "session",
      label: "Session",
      used: pw.used_percent,
      limit: 100,
      percentage: pw.used_percent,
      resetsAt,
    });
  }

  if (rateLimit?.secondary_window) {
    const sw = rateLimit.secondary_window;
    const resetsAt = new Date(sw.reset_at * 1000);

    const totalDuration = sw.limit_window_seconds * 1000;
    const elapsed = totalDuration - sw.reset_after_seconds * 1000;
    const expectedPercentage = (elapsed / totalDuration) * 100;
    const diff = sw.used_percent - expectedPercentage;

    const pace: UsageWindow["pace"] =
      diff > 5
        ? { status: "ahead", percentage: Math.abs(diff) }
        : diff < -5
          ? { status: "behind", percentage: Math.abs(diff) }
          : { status: "on-track", percentage: Math.abs(diff) };

    windows.push({
      type: "weekly",
      label: "Weekly",
      used: sw.used_percent,
      limit: 100,
      percentage: sw.used_percent,
      resetsAt,
      pace,
    });
  }

  const codeReview = data.code_review_rate_limit;
  if (codeReview?.primary_window) {
    const crw = codeReview.primary_window;
    const resetsAt = new Date(crw.reset_at * 1000);

    windows.push({
      type: "model",
      label: "Code Review",
      used: crw.used_percent,
      limit: 100,
      percentage: crw.used_percent,
      resetsAt,
    });
  }

  return windows;
}

export async function fetchCodexUsage(): Promise<ProviderUsage> {
  const baseUsage: ProviderUsage = {
    provider: "codex",
    name: "Codex",
    icon: "codex-icon.png",
    enabled: true,
    authenticated: false,
    lastUpdated: null,
    windows: [],
  };

  const token = loadToken();

  if (!token) {
    return {
      ...baseUsage,
      error: "No Codex credentials found. Run `codex` CLI to authenticate.",
    };
  }

  const usageData = await fetchUsage(token);

  if (!usageData) {
    return {
      ...baseUsage,
      authenticated: true,
      error: "Failed to fetch usage data from Codex API.",
    };
  }

  const windows = parseUsageResponse(usageData);

  return {
    ...baseUsage,
    authenticated: true,
    lastUpdated: new Date(),
    windows,
    planName: usageData.plan_type,
  };
}
