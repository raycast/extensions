import { AmpUsage, AmpError } from "./types";

const NOT_LOGGED_IN_SIGNALS = ["not logged in", "please sign in", "unauthenticated", "login required"];

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

export function parseAmpUsage(output: string): { usage: AmpUsage | null; error: AmpError | null } {
  // 首先检测错误
  const detectedError = detectAmpError(output);
  if (detectedError) {
    return { usage: null, error: detectedError };
  }

  const lines = output.trim().split("\n");

  // Parse first line: Signed in as apple@example.com (nickname)
  const firstLine = lines[0] || "";
  const emailMatch = firstLine.match(/Signed in as\s+([^\s]+)\s+\(([^)]+)\)/);

  if (!emailMatch) {
    return {
      usage: null,
      error: {
        type: "unknown",
        message: "Failed to parse Amp output. Please check if the format has changed.",
      },
    };
  }

  const email = emailMatch[1];
  const nickname = emailMatch[2] || "";

  // Amp Free: 100% remaining today (resets daily) - https://...
  const ampFreeLine = lines.find((line) => line.includes("Amp Free:")) || "";
  const ampFreeMatch = ampFreeLine.match(/Amp Free:\s*([\d.]+)%\s*remaining(?:\s+today)?(?:\s+\(([^)]+)\))?/i);
  if (!ampFreeMatch) {
    return {
      usage: null,
      error: {
        type: "unknown",
        message: "Failed to parse Amp Free usage. Please check if the format has changed.",
      },
    };
  }

  const percentRemaining = clampPercent(parseFloat(ampFreeMatch[1]));
  const resetNote = ampFreeMatch[2]?.trim() || undefined;

  // Individual credits: $10 remaining ...
  const creditsLine = lines.find((line) => line.includes("Individual credits:")) || "";
  const creditsMatch = creditsLine.match(/Individual credits:\s*\$([\d.]+)/);
  const creditsRemaining = creditsMatch?.[1] ? parseFloat(creditsMatch[1]) : 0;

  const usage: AmpUsage = {
    email,
    nickname,
    ampFree: {
      percentRemaining,
      resetNote,
    },
    individualCredits: {
      remaining: creditsRemaining,
      unit: "$",
    },
  };

  return { usage, error: null };
}
