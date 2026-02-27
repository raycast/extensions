import { readFileSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import type { ClaudeOAuthCredentials } from "./types";
import { CREDENTIALS_PATH } from "./constants";

function resolveCredentialsPath(): string {
  const prefs = getPreferenceValues<{ credentialsPath?: string }>();
  const p = prefs.credentialsPath?.trim();
  if (p) {
    return p.replace(/^~/, process.env.HOME || "");
  }
  return CREDENTIALS_PATH;
}

export function readCredentials(): ClaudeOAuthCredentials {
  const path = resolveCredentialsPath();
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as ClaudeOAuthCredentials;
}

export function isTokenExpired(credentials: ClaudeOAuthCredentials): boolean {
  return Date.now() >= credentials.claudeAiOauth.expiresAt;
}

export function getValidAccessToken(): string {
  const creds = readCredentials();
  // Always re-read the file since the CLI may have refreshed the token
  // If expired, we still return it and let the API call handle 401
  return creds.claudeAiOauth.accessToken;
}

export interface SubscriptionInfo {
  tierLabel: string;
  subscriptionType: string;
  rateLimitTier: string;
}

const TIER_LABELS: Record<string, string> = {
  default_claude_max_5x: "Max 5x",
  default_claude_max: "Max",
  default_claude_pro: "Pro",
  default_claude_team: "Team",
  default_claude_enterprise: "Enterprise",
  default_claude_free: "Free",
};

export function getSubscriptionInfo(): SubscriptionInfo {
  const creds = readCredentials();
  const { subscriptionType, rateLimitTier } = creds.claudeAiOauth;

  let tierLabel = TIER_LABELS[rateLimitTier] || "";
  if (!tierLabel) {
    // Fallback: derive from rateLimitTier string
    const match = rateLimitTier.match(/claude_(\w+)/);
    if (match) {
      tierLabel = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    } else {
      tierLabel =
        subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1);
    }
  }

  return { tierLabel, subscriptionType, rateLimitTier };
}
