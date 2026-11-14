import type { AmpError, AmpFreeUsage, AmpSubscriptionUsage, AmpUsage } from "./types.ts";

const NOT_LOGGED_IN_SIGNALS = ["not logged in", "please sign in", "unauthenticated", "login required"];

const PARSE_ERROR: AmpError = {
  type: "unknown",
  message: "Failed to parse Amp output. Please check if the format has changed.",
};

const AMP_FREE_PATTERN = /Amp Free:\s*([\d.]+)%\s*remaining(?:\s+today)?(?:\s+\(([^)]+)\))?/i;
const SUBSCRIPTION_PATTERNS = [
  /Amp\s+(.+?)\s+Subscription:\s*([\d.]+)%\s+other\s+usage\s+and\s+([\d.]+)%\s+orb\s+usage\s+remaining(?:\s+-\s+(.+))?/i,
  /Subscription\s+(.+?):\s*([\d.]+)%\s+other\s+usage\s+and\s+([\d.]+)%\s+orb\s+usage\s+remaining(?:\s+-\s+(.+))?/i,
];
const TRAILING_URL_PATTERN = /\s+-\s+https?:\/\/\S+\s*$/i;
const CREDITS_PATTERN = /Individual credits:\s*\$([\d.]+)/i;
const SIGNED_IN_PATTERN = /Signed in as\s+(\S+)\s+\(([^)]+)\)/;

// 检测错误类型
export function detectAmpError(output: string): AmpError | null {
  const cleanOutput = output.toLowerCase();

  if (cleanOutput.includes("command not found") || cleanOutput.includes("no such file")) {
    return { type: "not_found", message: "Amp CLI not found. Please install it first." };
  }

  if (NOT_LOGGED_IN_SIGNALS.some((signal) => cleanOutput.includes(signal))) {
    return { type: "not_logged_in", message: "Not logged in. Please run 'amp login' first." };
  }

  return null;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function normalizeAmpOutput(output: string): string {
  // Non-TTY `amp usage` wraps labels in markdown bold: **Amp Free:**
  return output.replaceAll("**", "");
}

function parseAmpFree(text: string): AmpFreeUsage | undefined {
  const match = text.match(AMP_FREE_PATTERN);
  if (!match) return undefined;
  return {
    percentRemaining: clampPercent(parseFloat(match[1])),
    resetNote: match[2]?.trim() || undefined,
  };
}

function parseResetNote(value: string | undefined): string | undefined {
  const note = value?.replace(TRAILING_URL_PATTERN, "").trim();
  return note || undefined;
}

function parseSubscription(text: string): AmpSubscriptionUsage | undefined {
  for (const pattern of SUBSCRIPTION_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    return {
      plan: match[1].trim(),
      otherPercentRemaining: clampPercent(parseFloat(match[2])),
      orbPercentRemaining: clampPercent(parseFloat(match[3])),
      resetNote: parseResetNote(match[4]),
    };
  }
  return undefined;
}

export function parseAmpUsage(output: string): { usage: AmpUsage | null; error: AmpError | null } {
  const detectedError = detectAmpError(output);
  if (detectedError) {
    return { usage: null, error: detectedError };
  }

  const text = normalizeAmpOutput(output);
  const emailMatch = text.match(SIGNED_IN_PATTERN);
  if (!emailMatch) {
    return { usage: null, error: PARSE_ERROR };
  }

  const ampFree = parseAmpFree(text);
  const subscription = parseSubscription(text);
  if (!ampFree && !subscription) {
    return { usage: null, error: PARSE_ERROR };
  }

  const creditsMatch = text.match(CREDITS_PATTERN);
  const creditsRemaining = creditsMatch?.[1] ? parseFloat(creditsMatch[1]) : 0;

  const usage: AmpUsage = {
    email: emailMatch[1],
    nickname: emailMatch[2] || "",
    ampFree,
    subscription,
    individualCredits: {
      remaining: creditsRemaining,
      unit: "$",
    },
  };

  return { usage, error: null };
}
