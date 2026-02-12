import { existsSync, readFileSync } from "fs";
import { MetricLine } from "../types";
import { expandPath, formatResetTimeFromUnixSeconds } from "../utils";

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

function loadAuth(): CodexAuth {
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
}

export async function fetchCodex(): Promise<MetricLine[]> {
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

  if (usage.rate_limit) {
    const primary = usage.rate_limit.primary_window;
    if (primary) {
      const subtitle = primary.reset_at ? formatResetTimeFromUnixSeconds(primary.reset_at) : undefined;
      lines.push({
        type: "progress",
        label: "Session",
        value: primary.used_percent,
        max: 100,
        unit: "percent",
        subtitle,
      });
    }
    const secondary = usage.rate_limit.secondary_window;
    if (secondary) {
      const subtitle = secondary.reset_at ? formatResetTimeFromUnixSeconds(secondary.reset_at) : undefined;
      lines.push({
        type: "progress",
        label: "Weekly",
        value: secondary.used_percent,
        max: 100,
        unit: "percent",
        subtitle,
      });
    }
  }

  if (usage.code_review_rate_limit?.primary_window) {
    const crl = usage.code_review_rate_limit.primary_window;
    const subtitle = crl.reset_at ? formatResetTimeFromUnixSeconds(crl.reset_at) : undefined;
    lines.push({
      type: "progress",
      label: "Reviews",
      value: crl.used_percent,
      max: 100,
      unit: "percent",
      subtitle,
    });
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
}
