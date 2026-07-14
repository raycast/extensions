import { getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync } from "child_process";
import { accessSync, constants } from "fs";

const CLI_TIMEOUT_MS = 10_000;

/**
 * Resolve the path to the flashspace CLI binary.
 * Checks user preferences first, then common Homebrew paths, then falls back to PATH.
 */
export function getFlashspacePath(): string {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.flashspacePath) {
    try {
      accessSync(preferences.flashspacePath, constants.X_OK);
      return preferences.flashspacePath;
    } catch {
      // Fall through to auto-detect
    }
  }

  const possiblePaths = ["/opt/homebrew/bin/flashspace", "/usr/local/bin/flashspace"];

  for (const path of possiblePaths) {
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      // Continue to next path
    }
  }

  return "flashspace";
}

/**
 * Execute a flashspace CLI command safely using execFileSync.
 * Arguments are passed as an array to prevent shell injection.
 */
export function runFlashspace(args: string[]): string {
  const flashspace = getFlashspacePath();
  return execFileSync(flashspace, args, { timeout: CLI_TIMEOUT_MS }).toString();
}

/** Error thrown by runFlashspaceAsync with structured context for toasts and logging. */
export class FlashspaceError extends Error {
  readonly stderr: string;
  /** Short, human-readable message suitable for a Raycast toast. */
  readonly userMessage: string;

  constructor(message: string, stderr: string, userMessage: string) {
    super(message);
    this.name = "FlashspaceError";
    this.stderr = stderr;
    this.userMessage = userMessage;
  }
}

function buildUserMessage(originalMessage: string, stderr: string): string {
  if (originalMessage.includes("ENOENT") || originalMessage.includes("not found")) {
    return "flashspace binary not found — install with Homebrew: brew install flashspace";
  }
  if (originalMessage.includes("EACCES") || originalMessage.includes("Permission denied")) {
    return "Permission denied running flashspace — check file permissions";
  }
  const stderrFirstLine = stderr.trim().split("\n")[0];
  return stderrFirstLine || originalMessage;
}

/**
 * Return the best short message to display in a Raycast toast.
 * Uses `userMessage` when the error is a FlashspaceError, otherwise falls back
 * to the standard Error message or a stringified value.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FlashspaceError) {
    return error.userMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Execute a flashspace CLI command asynchronously.
 * Returns stdout as a string on success; rejects with a FlashspaceError on failure.
 * All callers in UI action handlers must use this instead of runFlashspace.
 */
export function runFlashspaceAsync(args: string[], options?: { timeoutMs?: number }): Promise<string> {
  const flashspace = getFlashspacePath();
  const timeoutMs = options?.timeoutMs ?? CLI_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    execFile(flashspace, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        const userMessage = buildUserMessage(error.message, stderr);
        console.error(`[flashspace] command failed: ${flashspace} ${args.join(" ")}\n${stderr || error.message}`);
        reject(new FlashspaceError(error.message, stderr, userMessage));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Parse newline-separated text output into an array of strings.
 * Filters out empty lines.
 */
export function parseLines(stdout: string): string[] {
  return stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
}

/**
 * Parse workspace list output with optional display info.
 * When --with-display is used, format is "name,display1,display2,..." per line (comma-separated).
 * The first element is the workspace name, remaining elements are display names.
 */
export function parseWorkspaces(stdout: string): { name: string; display?: string }[] {
  return parseLines(stdout).map((line) => {
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) {
      return { name: line };
    }
    const name = line.substring(0, commaIndex);
    const display = line.substring(commaIndex + 1);
    return {
      name,
      display: display && display !== "None" ? display : undefined,
    };
  });
}

/**
 * Parse app list output with optional bundle ID.
 * When --with-bundle-id is used, format is "name,bundleId" per line (comma-separated).
 */
export function parseApps(stdout: string): { name: string; bundleId?: string }[] {
  return parseLines(stdout).map((line) => {
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) {
      return { name: line };
    }
    return {
      name: line.substring(0, commaIndex),
      bundleId: line.substring(commaIndex + 1) || undefined,
    };
  });
}

/**
 * Parse running apps output.
 * Format is "name,bundleId" per line when --with-bundle-id is used (comma-separated).
 */
export function parseRunningApps(stdout: string): { name: string; bundleId?: string }[] {
  return parseApps(stdout);
}
