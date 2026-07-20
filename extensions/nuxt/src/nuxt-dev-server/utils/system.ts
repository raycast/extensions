/**
 * System utilities for process management and file operations
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NUXT_PATH_PATTERNS, SHELL_COMMANDS } from "../constants/config";

/**
 * Project information from package.json
 */
export interface ProjectInfo {
  name?: string;
  version?: string;
  repository?: string;
}

/**
 * Process resource usage statistics
 */
export interface ProcessStats {
  memory?: string; // e.g., "123 MB"
  cpu?: string; // e.g., "2.5%"
}

/**
 * Execute a shell command safely with timeout
 */
export function execCommand(command: string, timeout = 1000): string | null {
  try {
    return execSync(command, { encoding: "utf8", timeout }).trim();
  } catch {
    return null;
  }
}

/**
 * Extract project working directory from process command line
 * Tries multiple patterns to find the path
 */
export function extractCwdFromCommand(command: string): string | null {
  for (const pattern of NUXT_PATH_PATTERNS) {
    const match = command.match(pattern);
    if (match && match[1]) {
      // Clean up the path
      return match[1].replace(/\/$/, ""); // Remove trailing slash
    }
  }
  return null;
}

/**
 * Get process working directory using lsof as fallback
 */
export function getCwdFromLsof(pid: string): string | null {
  const output = execCommand(SHELL_COMMANDS.GET_PROCESS_CWD(pid));
  if (!output) return null;

  const lines = output.split("\n");
  for (const line of lines) {
    if (line.startsWith("n")) {
      return line.substring(1);
    }
  }
  return null;
}

/**
 * Read and parse package.json from a directory
 */
export function readPackageJson(cwd: string): ProjectInfo | null {
  const packageJsonPath = join(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return {
      name: packageJson.name,
      version: packageJson.version,
      repository: packageJson.repository?.url || packageJson.repository,
    };
  } catch {
    return null;
  }
}

/**
 * Read git remote origin URL from .git/config
 */
export function readGitConfig(cwd: string): string | null {
  const gitConfigPath = join(cwd, ".git", "config");

  if (!existsSync(gitConfigPath)) {
    return null;
  }

  try {
    const gitConfig = readFileSync(gitConfigPath, "utf8");
    // Look for [remote "origin"] url = ...
    const urlMatch = gitConfig.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
    return urlMatch?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get process memory and CPU usage
 */
export function getProcessStats(pid: string): ProcessStats {
  const output = execCommand(SHELL_COMMANDS.GET_PROCESS_STATS(pid));
  if (!output) return {};

  const parts = output.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return {};

  const memoryKB = parseInt(parts[0], 10);
  const cpuPercent = parseFloat(parts[1]);

  return {
    memory: `${Math.round(memoryKB / 1024)} MB`,
    cpu: `${cpuPercent.toFixed(1)}%`,
  };
}

/**
 * Kill a process by PID
 */
export function killProcess(pid: string): void {
  execSync(SHELL_COMMANDS.KILL_PROCESS(pid));
}

/**
 * Clean up git URL to https format for opening in browser
 */
export function normalizeGitUrl(repoUrl: string): string {
  let url = repoUrl;

  // Remove git+ prefix
  if (url.startsWith("git+")) {
    url = url.substring(4);
  }

  // Convert SSH to HTTPS
  if (url.startsWith("git@")) {
    url = url.replace("git@github.com:", "https://github.com/");
  }

  // Remove .git suffix
  url = url.replace(/\.git$/, "");

  return url;
}
