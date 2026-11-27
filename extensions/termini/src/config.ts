import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "crypto";
import { existsSync, statSync } from "fs";
import { homedir, tmpdir, userInfo } from "os";
import path from "path";
import { TerminiConfig } from "./types";

const DEFAULT_VISIBLE_TERMINAL_LINES = 23;
const DEFAULT_TERMINAL_COLUMNS = 90;
const DEFAULT_SHELL_ARGS = "-il";
const DEFAULT_MAX_TRANSCRIPT_LINES = 4000;

export function readConfig(): TerminiConfig {
  const preferences = getPreferenceValues<Preferences.OpenTermini>();
  const shellPath = preferences.shellPath?.trim() || loginShell();
  const shellArgsText = preferences.shellArgs?.trim() || DEFAULT_SHELL_ARGS;
  const supportPath = path.join(environment.supportPath, "daemon");
  const socketPath = getSocketPath(supportPath);

  return {
    shellPath,
    shellArgs: splitCommandLine(shellArgsText),
    workingDirectory: resolveDirectory(preferences.workingDirectory?.trim() || "~"),
    visibleTerminalLines: DEFAULT_VISIBLE_TERMINAL_LINES,
    terminalColumns: readPositiveInteger(preferences.terminalColumns, DEFAULT_TERMINAL_COLUMNS),
    maxTranscriptLines: readPositiveInteger(preferences.maxTranscriptLines, DEFAULT_MAX_TRANSCRIPT_LINES),
    pythonPath: resolvePython(preferences.pythonPath?.trim()),
    terminalApp: preferences.terminalApp?.path || "Terminal",
    supportPath,
    daemonPath: path.join(environment.assetsPath, "terminid.py"),
    configPath: path.join(supportPath, "config.json"),
    pidPath: path.join(supportPath, "terminid.pid"),
    logPath: path.join(supportPath, "terminid.log"),
    socketPath,
  };
}

// The account's login shell (Directory Services UserShell), same one Terminal.app starts.
function loginShell() {
  try {
    const shell = userInfo().shell;
    if (shell && existsSync(shell)) return shell;
  } catch {
    // Fall through to $SHELL.
  }
  return process.env.SHELL || "/bin/zsh";
}

function getSocketPath(supportPath: string) {
  const hash = createHash("sha256").update(supportPath).digest("hex").slice(0, 12);
  const owner = typeof process.getuid === "function" ? process.getuid() : "user";
  return path.join(tmpdir(), `termini-${owner}-${hash}.sock`);
}

function resolveDirectory(input: string) {
  const resolved = input === "~" ? homedir() : input.startsWith("~/") ? path.join(homedir(), input.slice(2)) : input;
  try {
    return statSync(resolved).isDirectory() ? resolved : homedir();
  } catch {
    return homedir();
  }
}

function resolvePython(input?: string) {
  const value = input || defaultPythonPath();
  if (!value.includes("/")) return value;
  return existsSync(value) ? value : defaultPythonPath();
}

function defaultPythonPath() {
  for (const candidate of ["/usr/bin/python3", "/opt/homebrew/bin/python3", "/usr/local/bin/python3"]) {
    if (existsSync(candidate)) return candidate;
  }
  return "python3";
}

function splitCommandLine(input: string) {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const character of input) {
    if (escaping) {
      current += character;
      escaping = false;
    } else if (character === "\\") {
      escaping = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else current += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (current) args.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  if (current) args.push(current);
  return args;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
