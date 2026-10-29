import * as fs from "node:fs";
import * as path from "node:path";
import { runCoreCommand } from "./core-process";

/** GitHub URL for Paper Agent core (install instructions). */
export const CORE_INSTALL_URL = "https://github.com/galleonli/paper-agent";

export type CoreCheckPrefs = {
  configPath?: string;
  paperDir?: string;
  pythonPath?: string;
};

/**
 * One-line install: clone repo, cd, run bootstrap. Paste in terminal for one-click install.
 */
export function getBootstrapCopyText(): string {
  return `git clone ${CORE_INSTALL_URL}.git && cd paper-agent && ./scripts/bootstrap.sh`;
}

/**
 * Check if Paper Agent core is available: config exists and `python -m paper_agent` runs.
 */
export async function checkCoreAvailable(
  prefs: CoreCheckPrefs,
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const configPath = (prefs.configPath ?? "").trim();
  if (!configPath) {
    return { ok: false, error: "Config file path is not set in Preferences." };
  }
  if (!fs.existsSync(configPath)) {
    return { ok: false, error: `Config file not found: ${configPath}` };
  }

  const agentRoot = path.dirname(configPath);
  const pythonBin = (prefs.pythonPath ?? "").trim() || path.join(agentRoot, ".venv", "bin", "python3");
  if (!fs.existsSync(pythonBin)) {
    return { ok: false, error: `Python executable not found: ${pythonBin}` };
  }

  try {
    await runCoreCommand(pythonBin, ["-m", "paper_agent", "run", "--help"], {
      cwd: agentRoot,
      timeout: 10_000,
      signal,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Paper Agent core could not be started.",
    };
  }
}
