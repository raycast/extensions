import { existsSync, readFileSync } from "fs";
import { MetricLine } from "../types";
import { expandPath, formatResetTimeFromISO, readKeychainPassword } from "../utils";

// Private Types

interface ClaudeCredentials {
  accessToken: string;
  expiresAt?: number; // milliseconds since epoch
  subscriptionType?: string;
}

interface ClaudeWindow {
  utilization: number;
  resets_at?: string;
}

interface ClaudeExtraUsage {
  is_enabled?: boolean;
  used_credits?: number; // cents
  monthly_limit?: number; // cents
  currency?: string;
}

interface ClaudeUsageResponse {
  five_hour?: ClaudeWindow;
  seven_day?: ClaudeWindow;
  seven_day_opus?: ClaudeWindow;
  extra_usage?: ClaudeExtraUsage;
}

// Credential Resolution

const CENTS_PER_DOLLAR = 100;

function isExpired(expiresAtMs?: number): boolean {
  if (!expiresAtMs) return false;
  const bufferSeconds = 300;
  return Date.now() / 1000 > expiresAtMs / 1000 - bufferSeconds;
}

/**
 * Attempt to load Claude credentials from macOS Keychain.
 * Service: "Claude Code-credentials"
 */

function loadFromKeychain(): ClaudeCredentials | null {
  const raw = readKeychainPassword("Claude Code-credentials");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const oauth = parsed.claudeAiOauth;
    if (!oauth?.accessToken) return null;
    return {
      accessToken: oauth.accessToken,
      expiresAt: oauth.expiresAt,
      subscriptionType: oauth.subscriptionType,
    };
  } catch {
    return null;
  }
}

/**
 * Load Claude credentials from ~/.claude/.credentials.json
 */
function loadFromFile(): ClaudeCredentials {
  const path = expandPath("~/.claude/.credentials.json");
  if (!existsSync(path)) {
    throw new Error("Claude not found. Sign in with Claude Code.");
  }
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const oauth = data.claudeAiOauth;
  if (!oauth?.accessToken) {
    throw new Error("Claude credentials missing. Sign in with Claude Code.");
  }
  return {
    accessToken: oauth.accessToken,
    expiresAt: oauth.expiresAt,
    subscriptionType: oauth.subscriptionType,
  };
}

/**
 * Resolve credentials: keychain first, then file fallback.
 */
function loadCredentials(): ClaudeCredentials {
  const keychain = loadFromKeychain();
  if (keychain) return keychain;
  return loadFromFile();
}

// Output Building

function formatPlanLabel(subscriptionType?: string): string | undefined {
  if (!subscriptionType) return undefined;
  const type = subscriptionType.toLowerCase();
  switch (type) {
    case "pro":
      return "Pro";
    case "max":
    case "max_5x":
      return "Max";
    case "team":
      return "Team";
    case "enterprise":
      return "Enterprise";
    case "free":
      return "Free";
    default:
      return subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1);
  }
}

function makeProgressLine(window: ClaudeWindow | undefined, label: string): MetricLine | undefined {
  if (!window) return undefined;
  const subtitle = window.resets_at ? formatResetTimeFromISO(window.resets_at) : undefined;
  return {
    type: "progress",
    label,
    value: window.utilization,
    max: 100,
    unit: "percent",
    subtitle,
  };
}

function makeExtraUsageLine(extra: ClaudeExtraUsage | undefined): MetricLine | undefined {
  if (!extra || !extra.is_enabled || extra.used_credits == null || !extra.monthly_limit || extra.monthly_limit <= 0) {
    return undefined;
  }
  return {
    type: "progress",
    label: "Extra",
    value: extra.used_credits / CENTS_PER_DOLLAR,
    max: extra.monthly_limit / CENTS_PER_DOLLAR,
    unit: "dollars",
  };
}

// Main Fetch

/**
 * Fetch Claude usage data.
 * API: GET https://api.anthropic.com/api/oauth/usage
 */
export async function fetchClaude(): Promise<MetricLine[]> {
  const credentials = loadCredentials();

  if (isExpired(credentials.expiresAt)) {
    throw new Error("Claude token expired. Sign in again in Claude Code.");
  }

  const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "anthropic-beta": "oauth-2025-04-20",
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Claude token invalid. Sign in again.");
  }
  if (!response.ok) {
    throw new Error("Claude usage request failed.");
  }

  const usage = (await response.json()) as ClaudeUsageResponse;
  const lines: MetricLine[] = [];

  // Plan badge
  const planLabel = formatPlanLabel(credentials.subscriptionType);
  if (planLabel) {
    lines.push({ type: "badge", label: "Plan", text: planLabel });
  }

  // Usage windows: Session (5h), Weekly (7d), Opus (7d opus)
  const windowConfigs: [ClaudeWindow | undefined, string][] = [
    [usage.five_hour, "Session"],
    [usage.seven_day, "Weekly"],
    [usage.seven_day_opus, "Opus"],
  ];

  for (const [window, label] of windowConfigs) {
    const line = makeProgressLine(window, label);
    if (line) lines.push(line);
  }

  // Extra usage (overages)
  const extraLine = makeExtraUsageLine(usage.extra_usage);
  if (extraLine) lines.push(extraLine);

  if (lines.length === 0) {
    lines.push({ type: "text", label: "Status", value: "No usage data" });
  }

  return lines;
}
