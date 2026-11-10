import * as path from "node:path";
import type { CoreCheckPrefs } from "./core-check";
import { runCoreCommand } from "./core-process";

export const EXTENSION_BUILD = "2026.10.26.1";
export const CORE_RELEASES_URL = "https://github.com/galleonli/paper-agent/releases/latest";
export const UPDATE_GUIDE_URL = "https://github.com/galleonli/paper-agent-raycast#updates";

export type CoreInstallation = {
  version: string | null;
  pythonVersion: string;
  modulePath: string;
};

const inspectCore = `
import json
import platform
from importlib.metadata import PackageNotFoundError, version
import paper_agent
try:
    core_version = version("paper-agent")
except PackageNotFoundError:
    core_version = None
print(json.dumps({"version": core_version, "pythonVersion": platform.python_version(), "modulePath": paper_agent.__file__}))
`;

export function parseCoreInstallation(output: string): CoreInstallation {
  try {
    const value = JSON.parse(output);
    if (
      value &&
      (value.version === null || typeof value.version === "string") &&
      typeof value.pythonVersion === "string" &&
      typeof value.modulePath === "string"
    ) {
      return { version: value.version, pythonVersion: value.pythonVersion, modulePath: value.modulePath };
    }
  } catch {
    // Do not expose subprocess output, which may contain private paths or settings.
  }
  throw new Error("Could not read the core version. Check your Python installation.");
}

export async function readCoreInstallation(prefs: CoreCheckPrefs, signal: AbortSignal): Promise<CoreInstallation> {
  const configPath = prefs.configPath?.trim();
  if (!configPath) throw new Error("Set Config File Path in extension preferences to inspect the core.");
  const agentRoot = path.dirname(configPath);
  const pythonBin = prefs.pythonPath?.trim() || path.join(agentRoot, ".venv", "bin", "python3");
  const output = await runCoreCommand(pythonBin, ["-c", inspectCore], { cwd: agentRoot, timeout: 10_000, signal });
  return parseCoreInstallation(output);
}

export function describeCoreUpdate(installed: string | null, latest: string): string {
  const stableVersion = /^\d+\.\d+\.\d+$/;
  if (!installed || !stableVersion.test(installed) || !stableVersion.test(latest)) {
    return `Latest stable release: ${latest}. The installed version cannot be compared automatically.`;
  }
  const currentParts = installed.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);
  for (let i = 0; i < currentParts.length; i++) {
    if (currentParts[i] < latestParts[i]) return `Update available: ${installed} → ${latest}. Open the update guide.`;
    if (currentParts[i] > latestParts[i])
      return `Installed ${installed} is newer than the latest stable release (${latest}).`;
  }
  return `Up to date with the latest stable release (${latest}).`;
}

export async function checkCoreUpdate(installed: Promise<string | null>, signal: AbortSignal): Promise<string> {
  const installedVersion = await installed;
  signal.throwIfAborted();
  const response = await fetch("https://api.github.com/repos/galleonli/paper-agent/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}. Try again later.`);
  const release = await response.json();
  if (
    !release ||
    typeof release !== "object" ||
    !("tag_name" in release) ||
    typeof release.tag_name !== "string" ||
    !/^v\d+\.\d+\.\d+$/.test(release.tag_name)
  ) {
    throw new Error("GitHub did not return a recognized stable release.");
  }
  return describeCoreUpdate(installedVersion, release.tag_name.slice(1));
}
