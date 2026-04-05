import { existsSync } from "fs";
import { escapeForShell } from "../../utils";
import { runAppleScript } from "@raycast/utils";

export const getApfelPath = () => {
  const candidates = [
    "/opt/homebrew/bin/apfel", // Apple Silicon brew
    "/usr/local/bin/apfel", // Intel brew
    "/usr/bin/apfel", // fallback
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  throw new Error("apfel binary not found. Install it with:\n  brew install Arthur-Ficial/tap/apfel");
};

export async function isApfelInstalled() {
  try {
    const result = await runAppleScript(`do shell script "${getApfelPath()} --model-info"`);
    return { apfel: true, appleIntelligence: result.includes("available:  yes") };
  } catch {
    return { apfel: false, appleIntelligence: false };
  }
}

export function runApfelScript(prompt: string) {
  return runAppleScript(`do shell script "${getApfelPath()} '${escapeForShell(prompt)}'"`, {
    timeout: 60000,
  });
}
