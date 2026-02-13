import { existsSync, readFileSync } from "fs";
import { formatResetTimeFromUnixSeconds } from "../format";
import { expandPath } from "../system";
import { MetricLine } from "../types";

interface CodexAuth {
  accessToken: string;
  accountId?: string;
}

interface CodexWindow {
  used_percent: number;
  reset_at?: number;
  limit_window_seconds?: number;
}

interface CodexUsageResponse {
  plan_type?: string;
  rate_limit?: {
    primary_window?: CodexWindow;
    secondary_window?: CodexWindow;
  };
  code_review_rate_limit?: {
    primary_window?: CodexWindow;
  };
  credits?: {
    has_credits?: boolean;
    unlimited?: boolean;
    balance?: number;
  };
}

const makeProgressLine = (
  window: CodexWindow,
  label: string,
  formatReset: (seconds: number) => string | undefined,
): MetricLine => {
  const subtitle = window.reset_at ? formatReset(window.reset_at) : undefined;
  return {
    type: "progress",
    label,
    value: window.used_percent,
    max: 100,
    unit: "percent",
    subtitle,
  };
};

const loadAuth = (): CodexAuth => {
  const path = expandPath("~/.codex/auth.json");
  if (!existsSync(path)) {
    throw new Error("Codex not found. Sign in with Codex CLI.");
  }
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const tokens = data.tokens;
  if (!tokens?.access_token) {
    throw new Error("Codex credentials missing. Sign in with Codex CLI.");
  }
  return {
    accessToken: tokens.access_token,
    accountId: tokens.account_id,
  };
};

export const fetchCodex = async (): Promise<MetricLine[]> => {
  const auth = loadAuth();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: "application/json",
  };
  if (auth.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId;
  }

  const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    method: "GET",
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Codex token invalid. Sign in again.");
  }
  if (!response.ok) {
    throw new Error("Codex usage request failed.");
  }

  const usage = (await response.json()) as CodexUsageResponse;
  const lines: MetricLine[] = [];

  const planType = usage.plan_type ?? "free";
  const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);
  lines.push({ type: "badge", label: "Plan", text: planLabel });

  const formatReset = formatResetTimeFromUnixSeconds;
  if (usage.rate_limit?.primary_window) {
    lines.push(makeProgressLine(usage.rate_limit.primary_window, "Session", formatReset));
  }
  if (usage.rate_limit?.secondary_window) {
    lines.push(makeProgressLine(usage.rate_limit.secondary_window, "Weekly", formatReset));
  }
  if (usage.code_review_rate_limit?.primary_window) {
    lines.push(makeProgressLine(usage.code_review_rate_limit.primary_window, "Reviews", formatReset));
  }

  if (usage.credits?.has_credits) {
    if (usage.credits.unlimited) {
      lines.push({ type: "text", label: "Credits", value: "Unlimited" });
    } else if (usage.credits.balance != null) {
      lines.push({ type: "text", label: "Credits", value: usage.credits.balance.toFixed(2) });
    }
  }

  if (lines.length === 1) {
    lines.push({ type: "text", label: "Status", value: "No usage data" });
  }

  return lines;
};
