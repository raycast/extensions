import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const HOME = os.homedir();

export const CLAUDE_DIR = path.join(HOME, ".claude");
export const CLAUDE_MONITOR_DIR = path.join(CLAUDE_DIR, "claude-code-monitor");

export function escapeMarkdown(text: string): string {
  return text.replace(/([#*_`|~[\]\\<>])/g, "\\$1");
}

export function buildClaudeEnv(
  extraEnv?: Record<string, string>,
): NodeJS.ProcessEnv {
  const extraPaths = [
    path.join(HOME, ".local", "share", "fnm", "aliases", "default", "bin"),
    path.join(HOME, ".local", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ].join(":");
  const basePath = process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin";
  return {
    ...process.env,
    PATH: `${extraPaths}:${basePath}`,
    ...extraEnv,
  };
}
