import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const GEMINI_BINARY_NAME = "gemini";

const GEMINI_PATH_ENV_KEYS = ["GEMINI_PATH", "GEMINI_CLI_PATH"];

function cleanString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isExecutableFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return false;
    }

    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveGeminiBinaryPathFromShell(): string | null {
  try {
    const result = execSync("command -v gemini || which gemini", { encoding: "utf-8", timeout: 5000 });
    const candidate = cleanString(result.split("\n")[0]);
    if (!candidate) {
      return null;
    }

    return isExecutableFile(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function compareVersionDesc(a: string, b: string): number {
  const aParts = a.split(".").map((part) => Number.parseInt(part, 10));
  const bParts = b.split(".").map((part) => Number.parseInt(part, 10));

  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const aValue = Number.isFinite(aParts[i]) ? aParts[i] : 0;
    const bValue = Number.isFinite(bParts[i]) ? bParts[i] : 0;

    if (aValue !== bValue) {
      return bValue - aValue;
    }
  }

  return b.localeCompare(a);
}

export function findLatestMiseGeminiBinaryPath(nodeInstallDir: string): string | null {
  try {
    if (!fs.existsSync(nodeInstallDir)) {
      return null;
    }

    const versions = fs
      .readdirSync(nodeInstallDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((version) => /^\d+(?:\.\d+)*$/.test(version))
      .sort(compareVersionDesc);

    for (const version of versions) {
      const candidate = path.join(nodeInstallDir, version, "bin", GEMINI_BINARY_NAME);
      if (isExecutableFile(candidate)) {
        return candidate;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveGeminiBinaryPath(): string | null {
  for (const key of GEMINI_PATH_ENV_KEYS) {
    const fromEnv = cleanString(process.env[key]);
    if (fromEnv && isExecutableFile(fromEnv)) {
      return fromEnv;
    }
  }

  const fromShell = resolveGeminiBinaryPathFromShell();
  if (fromShell) {
    return fromShell;
  }

  const homeDir = os.homedir();
  const commonCandidates = [
    path.join(homeDir, ".local", "share", "mise", "installs", "node", "current", "bin", GEMINI_BINARY_NAME),
    path.join(homeDir, ".local", "bin", GEMINI_BINARY_NAME),
    "/opt/homebrew/bin/gemini",
    "/usr/local/bin/gemini",
    "/usr/bin/gemini",
  ];

  for (const candidate of commonCandidates) {
    if (isExecutableFile(candidate)) {
      return candidate;
    }
  }

  const latestMiseGeminiPath = findLatestMiseGeminiBinaryPath(
    path.join(homeDir, ".local", "share", "mise", "installs", "node"),
  );

  if (latestMiseGeminiPath) {
    return latestMiseGeminiPath;
  }

  const miseShimPath = path.join(homeDir, ".local", "share", "mise", "shims", GEMINI_BINARY_NAME);
  if (isExecutableFile(miseShimPath)) {
    return miseShimPath;
  }

  return null;
}

export function resolveGeminiCommand(): string {
  return resolveGeminiBinaryPath() ?? GEMINI_BINARY_NAME;
}
