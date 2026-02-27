import { exec } from "../utils/exec";
import type { PrintInfo } from "../types";

/**
 * Runs `launchctl print gui/{uid}/{label}` and parses the output.
 */
export async function getPrintInfo(label: string): Promise<PrintInfo | null> {
  try {
    const uid =
      process.getuid?.() ?? parseInt((await exec("id", ["-u"])).trim(), 10);

    const result = await exec("launchctl", ["print", `gui/${uid}/${label}`], {
      nothrow: true,
    });

    if (!result || result.includes("Could not find service")) {
      return null;
    }

    const state = extractField(result, /state\s*=\s*(.+)/);
    const runsStr = extractField(result, /runs\s*=\s*(\d+)/);
    const lastExitStr = extractField(result, /last exit code\s*=\s*(.+)/);
    const path = extractField(result, /path\s*=\s*(.+)/);
    const program = extractField(result, /program\s*=\s*(.+)/);
    const stdoutPath =
      extractField(result, /stdout path\s*=\s*(.+)/) || undefined;
    const stderrPath =
      extractField(result, /stderr path\s*=\s*(.+)/) || undefined;

    const arguments_ = extractArguments(result);

    let lastExitCode: number | null = null;
    if (lastExitStr && !lastExitStr.includes("never exited")) {
      const parsed = parseInt(lastExitStr, 10);
      if (!isNaN(parsed)) {
        lastExitCode = parsed;
      }
    }

    return {
      state: state || "unknown",
      runs: runsStr ? parseInt(runsStr, 10) : 0,
      lastExitCode,
      path: path || "",
      program: program || "",
      arguments: arguments_,
      stdoutPath,
      stderrPath,
    };
  } catch {
    return null;
  }
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractArguments(text: string): string[] {
  const match = text.match(/arguments\s*=\s*\{([^}]*)\}/);
  if (!match?.[1]) return [];

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
