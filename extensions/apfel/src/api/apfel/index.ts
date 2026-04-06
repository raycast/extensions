import { existsSync } from "fs";
import { escapeForShell } from "../../utils";
import { runAppleScript } from "@raycast/utils";
import { getSelectedFinderItems } from "@raycast/api";

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

function isApfelInstalled() {
  try {
    getApfelPath();
    return true;
  } catch {
    return false;
  }
}

async function isAppleIntelligenceAvailable() {
  try {
    const result = await runAppleScript(`do shell script "${getApfelPath()} --model-info"`);
    return result.includes("available:  yes");
  } catch {
    return false;
  }
}

async function hasFinderPermission() {
  try {
    await getSelectedFinderItems();
    return true;
  } catch {
    // ignore
  }

  try {
    await runAppleScript(`tell application "Finder" to get selection`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return !message.includes("-1743") && !message.includes("not allowed");
  }
}

export function runApfelScript(prompt: string) {
  return runAppleScript(`do shell script "${getApfelPath()} '${escapeForShell(prompt)}'"`, {
    timeout: 60000,
  });
}

export async function checkApfel(
  checkForFileSystemPermission = false,
): Promise<"not_installed" | "ai_unavailable" | "ready" | "finder_permission_denied"> {
  if (!isApfelInstalled()) return "not_installed";
  if (!(await isAppleIntelligenceAvailable())) return "ai_unavailable";
  if (checkForFileSystemPermission && !(await hasFinderPermission())) return "finder_permission_denied";

  return "ready";
}
