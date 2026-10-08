import { execFileSync, execFile } from "child_process";
import { promisify } from "util";
import { existsSync, statSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Get the size of a directory or file in bytes using `du`.
 * Returns 0 if the path doesn't exist.
 */
export function getSize(path: string): number {
  if (!existsSync(path)) return 0;
  try {
    // du -sk gives size in kilobytes
    const output = execFileSync("du", ["-sk", path], {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const kb = parseInt(output.split("\t")[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

const execFileAsync = promisify(execFile);

/**
 * Async version of getSize that uses `du` without blocking the event loop.
 * Returns 0 if the path doesn't exist or on error.
 */
export async function getSizeAsync(path: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("du", ["-sk", path], { timeout: 30000 });
    const output = String(stdout).trim();
    const kb = parseInt(output.split("\t")[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

/**
 * Get file/directory count in a path (non-recursive, top-level items).
 */
export function getItemCount(path: string): number {
  if (!existsSync(path)) return 0;
  try {
    return readdirSync(path).length;
  } catch {
    return 0;
  }
}

/**
 * Get last modified time of a path (seconds since epoch).
 */
export function getLastModified(path: string): number {
  try {
    return Math.floor(statSync(path).mtimeMs / 1000);
  } catch {
    return 0;
  }
}

/**
 * Check if a directory exists and is non-empty.
 */
export function isDirPresent(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const stat = statSync(path);
    if (!stat.isDirectory()) return false;
    return readdirSync(path).length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a command-line tool is available.
 */
export function isToolAvailable(tool: string): boolean {
  try {
    execFileSync("which", [tool], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Async version of `isToolAvailable`.
 */
export async function isToolAvailableAsync(tool: string): Promise<boolean> {
  try {
    await execFileAsync("which", [tool], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Expand ~ to home directory.
 */
export function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

/**
 * Format age in days to human-readable string.
 */
export function formatAge(seconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const days = Math.floor((now - seconds) / 86400);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
