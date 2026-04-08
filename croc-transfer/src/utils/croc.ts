import { execSync } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  crocPath: string;
  downloadDirectory: string;
  autoAccept: boolean;
  customRelay: string;
}

const CANDIDATE_PATHS = [
  "/opt/homebrew/bin/croc", // Apple Silicon
  "/usr/local/bin/croc",    // Intel Mac
  "/usr/bin/croc",
];

let _resolvedPath: string | null = null;

export function getCrocPath(): string | null {
  if (_resolvedPath) return _resolvedPath;

  const prefs = getPreferenceValues<Preferences>();

  // 1. User-configured path
  if (prefs.crocPath?.trim()) {
    const p = prefs.crocPath.trim();
    if (existsSync(p)) {
      _resolvedPath = p;
      return p;
    }
  }

  // 2. which croc (PATH lookup)
  try {
    const result = execSync("which croc", { encoding: "utf8", timeout: 3000 }).trim();
    if (result && existsSync(result)) {
      _resolvedPath = result;
      return result;
    }
  } catch {
    // not in PATH
  }

  // 3. Known Homebrew paths
  for (const p of CANDIDATE_PATHS) {
    if (existsSync(p)) {
      _resolvedPath = p;
      return p;
    }
  }

  return null;
}

export function getCrocVersion(crocPath: string): string | null {
  try {
    const output = execSync(`"${crocPath}" --version`, { encoding: "utf8", timeout: 3000 });
    const match = output.match(/croc\s+v?([\d.]+)/i);
    return match ? match[1] : output.trim().split("\n")[0];
  } catch {
    return null;
  }
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function buildCrocArgs(subcommand: "send" | "receive", extra: string[]): string[] {
  const prefs = getPrefs();
  const args: string[] = [];

  if (prefs.customRelay?.trim()) {
    args.push("--relay", prefs.customRelay.trim());
  }

  if (subcommand === "send") {
    args.push("send");
    args.push(...extra);
  } else {
    // croc v10: receive via CROC_SECRET env var (see buildCrocEnv)
    // Command is just: croc [--yes]
    // The code phrase is passed via CROC_SECRET environment variable
    if (prefs.autoAccept) args.push("--yes");
    // extra[0] is the code phrase — handled in buildCrocEnv, not in args
  }

  return args;
}

/** Build environment for croc receive (sets CROC_SECRET) */
export function buildCrocEnv(subcommand: "send" | "receive", codePhrase?: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (subcommand === "receive" && codePhrase) {
    env["CROC_SECRET"] = codePhrase;
  }
  return env;
}
