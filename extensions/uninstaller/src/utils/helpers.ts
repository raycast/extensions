import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";

// Debug logging function
export function log(message: string, ...args: unknown[]) {
  const { debugMode } = getPreferenceValues<Preferences>();
  if (debugMode) {
    console.log(`[Debug] ${message}`, ...args);
  }
}

// Formats error messages
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Escapes file paths for shell commands
export function escapeShellPath(filePath: string): string {
  return `'${filePath.replace(/'/g, "'\\''")}'`;
}

// Escapes strings for AppleScript
export function escapeAppleScript(str: string): string {
  return str.replace(/[\\"]/g, "\\$&");
}

// Formats byte sizes
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Checks if a file exists
export function fileExists(filePath: string): boolean {
  try {
    execSync(`test -e ${escapeShellPath(filePath)}`);
    return true;
  } catch {
    return false;
  }
}
