import { AmpUsage, AmpError } from "./types";

// 检测错误类型
export function detectAmpError(output: string): AmpError | null {
  const cleanOutput = output.toLowerCase();

  if (cleanOutput.includes("command not found") || cleanOutput.includes("no such file")) {
    return { type: "not_found", message: "Amp CLI not found. Please install it first." };
  }

  if (
    cleanOutput.includes("not logged in") ||
    cleanOutput.includes("login required") ||
    cleanOutput.includes("unauthorized")
  ) {
    return { type: "not_logged_in", message: "Not logged in. Please run 'amp login' first." };
  }

  if (cleanOutput.includes("signed in as") === false && output.trim().length > 0) {
    // 有输出但没有登录信息，可能是未登录
    return { type: "not_logged_in", message: "Not logged in. Please run 'amp login' first." };
  }

  return null;
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

  // Parse Amp Free line
  // Format: "Amp Free: $15/$15 remaining" where first number is REMAINING, second is TOTAL
  const ampFreeLine = lines.find((line) => line.includes("Amp Free:")) || "";
  const ampFreeMatch = ampFreeLine.match(/Amp Free:\s*\$([\d.]+)\/\$([\d.]+)/);
  const ampFreeRemaining = ampFreeMatch?.[1] ? parseFloat(ampFreeMatch[1]) : 0;
  const ampFreeTotal = ampFreeMatch?.[2] ? parseFloat(ampFreeMatch[2]) : 0;
  const ampFreeUsed = ampFreeTotal - ampFreeRemaining;

  // Parse replenish rate
  const replenishMatch = ampFreeLine.match(/replenishes\s+\+\$([\d.]+)\/hour/);
  const replenishRate = replenishMatch?.[1] ? `$${replenishMatch[1]}/hour` : undefined;

  // Parse bonus
  const bonusMatch = ampFreeLine.match(/\[(.+?)\]/);
  const bonus = bonusMatch?.[1];

  // Parse Individual credits line
  const creditsLine = lines.find((line) => line.includes("Individual credits:")) || "";
  const creditsMatch = creditsLine.match(/Individual credits:\s*\$([\d.]+)/);
  const creditsRemaining = creditsMatch?.[1] ? parseFloat(creditsMatch[1]) : 0;

  const usage: AmpUsage = {
    email,
    nickname,
    ampFree: {
      used: ampFreeUsed,
      total: ampFreeTotal,
      unit: "$",
      replenishRate,
      bonus,
    },
    individualCredits: {
      remaining: creditsRemaining,
      unit: "$",
    },
  };

  return { usage, error: null };
}
