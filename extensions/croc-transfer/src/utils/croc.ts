import { execSync, execFile, execFileSync } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

const CANDIDATE_PATHS = [
  "/opt/homebrew/bin/croc", // Apple Silicon
  "/usr/local/bin/croc", // Intel Mac
  "/usr/bin/croc",
];

let _resolvedPath: string | null = null;

export function clearCrocPathCache(): void {
  _resolvedPath = null;
}

export function getCrocPath(): string | null {
  if (_resolvedPath) return _resolvedPath;

  const prefs = getPreferenceValues<Preferences>();

  if (prefs.crocPath?.trim()) {
    const p = prefs.crocPath.trim();
    if (existsSync(p)) {
      _resolvedPath = p;
      return p;
    }
  }

  try {
    const result = execSync("which croc", {
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    if (result && existsSync(result)) {
      _resolvedPath = result;
      return result;
    }
  } catch {
    // not in PATH
  }

  for (const p of CANDIDATE_PATHS) {
    if (existsSync(p)) {
      _resolvedPath = p;
      return p;
    }
  }

  return null;
}

export function resolveCrocPathAsync(): Promise<string | null> {
  return new Promise((resolve) => {
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.crocPath?.trim() && existsSync(prefs.crocPath.trim())) {
      return resolve(prefs.crocPath.trim());
    }
    execFile("which", ["croc"], (err, stdout) => {
      const found = !err && stdout.trim();
      if (found) return resolve(stdout.trim());
      const candidate = CANDIDATE_PATHS.find((p) => existsSync(p)) ?? null;
      resolve(candidate);
    });
  });
}

export function getCrocVersion(crocPath: string): string | null {
  try {
    const output = execFileSync(crocPath, ["--version"], {
      encoding: "utf8",
      timeout: 3000,
    });
    const match = output.match(/croc\s+v?([\d.]+)/i);
    return match ? match[1] : output.trim().split("\n")[0];
  } catch {
    return null;
  }
}

export async function getCrocVersionAsync(
  crocPath: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(crocPath, ["--version"], { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve(null);
      const match = stdout.match(/croc\s+v?([\d.]+)/i);
      resolve(match ? match[1] : stdout.trim().split("\n")[0]);
    });
  });
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function buildCrocArgs(subcommand: "send", extra: string[]): string[];
export function buildCrocArgs(subcommand: "receive"): string[];
export function buildCrocArgs(
  subcommand: "send" | "receive",
  extra?: string[],
): string[] {
  const prefs = getPrefs();
  const args: string[] = [];

  if (prefs.customRelay?.trim()) {
    args.push("--relay", prefs.customRelay.trim());
  }

  if (subcommand === "send") {
    args.push("send");
    if (extra) args.push(...extra);
  } else {
    if (prefs.autoAccept) args.push("--yes");
  }

  return args;
}
