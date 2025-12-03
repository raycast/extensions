/**
 * Homebrew progress tracking utilities.
 *
 * Provides functions for executing brew commands with real-time progress updates.
 */

import { spawn } from "child_process";
import { brewExecutable } from "./paths";
import { execBrewEnv } from "./commands";
import { brewLogger } from "../logger";
import { BrewLockError, isBrewLockMessage, BrewCommandError } from "../errors";
import { ExecResult } from "../types";

/// Progress Types

/**
 * Phases of a brew operation.
 */
export type BrewPhase =
  | "starting"
  | "downloading"
  | "verifying"
  | "extracting"
  | "installing"
  | "linking"
  | "cleaning"
  | "complete"
  | "error";

/**
 * Progress information for a brew operation.
 */
export interface BrewProgress {
  phase: BrewPhase;
  message: string;
  percentage?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
}

/**
 * Callback for progress updates.
 */
export type ProgressCallback = (progress: BrewProgress) => void;

/// Progress Parsing

/**
 * Parse brew output to extract progress information.
 */
export function parseBrewOutput(line: string): BrewProgress | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // Downloading phase
  if (trimmedLine.includes("Downloading")) {
    return { phase: "downloading", message: trimmedLine };
  }

  // Download progress (e.g., "######## 50.0%")
  const percentMatch = trimmedLine.match(/#+\s*(\d+\.?\d*)%/);
  if (percentMatch) {
    return {
      phase: "downloading",
      message: `Downloading... ${percentMatch[1]}%`,
      percentage: parseFloat(percentMatch[1]),
    };
  }

  // Verifying checksum
  if (trimmedLine.includes("Verifying") || trimmedLine.includes("checksum")) {
    return { phase: "verifying", message: trimmedLine };
  }

  // Extracting/Pouring
  if (trimmedLine.includes("Pouring") || trimmedLine.includes("Extracting")) {
    return { phase: "extracting", message: trimmedLine };
  }

  // Installing
  if (trimmedLine.includes("Installing") || trimmedLine.includes("==> Installing")) {
    return { phase: "installing", message: trimmedLine };
  }

  // Linking
  if (trimmedLine.includes("Linking") || trimmedLine.includes("==> Linking")) {
    return { phase: "linking", message: trimmedLine };
  }

  // Cleaning
  if (trimmedLine.includes("Cleaning") || trimmedLine.includes("Removing")) {
    return { phase: "cleaning", message: trimmedLine };
  }

  // Caveats or summary
  if (trimmedLine.includes("==> Caveats") || trimmedLine.includes("==> Summary")) {
    return { phase: "complete", message: trimmedLine };
  }

  // Generic progress message
  if (trimmedLine.startsWith("==>")) {
    return { phase: "installing", message: trimmedLine };
  }

  return null;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Execute a brew command with real-time progress updates.
 */
export async function execBrewWithProgress(
  cmd: string,
  onProgress?: ProgressCallback,
  cancel?: AbortController,
): Promise<ExecResult> {
  const env = await execBrewEnv();
  const args = cmd.split(/\s+/).filter(Boolean);

  brewLogger.log("Executing brew with progress", { command: cmd });

  return new Promise((resolve, reject) => {
    const proc = spawn(brewExecutable(), args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Handle cancellation
    if (cancel) {
      cancel.signal.addEventListener("abort", () => {
        proc.kill("SIGTERM");
        const error = new Error("Aborted");
        error.name = "AbortError";
        reject(error);
      });
    }

    // Report starting
    onProgress?.({ phase: "starting", message: `Running: brew ${cmd}` });

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;

      // Parse each line for progress
      const lines = text.split("\n");
      for (const line of lines) {
        const progress = parseBrewOutput(line);
        if (progress) {
          onProgress?.(progress);
        }
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // Check for lock errors
      if (isBrewLockMessage(text)) {
        proc.kill("SIGTERM");
        reject(
          new BrewLockError("Another brew process is already running", {
            command: cmd,
          }),
        );
        return;
      }

      // Parse stderr for progress too (brew outputs some progress to stderr)
      const lines = text.split("\n");
      for (const line of lines) {
        const progress = parseBrewOutput(line);
        if (progress) {
          onProgress?.(progress);
        }
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.({ phase: "complete", message: "Operation completed successfully" });
        resolve({ stdout, stderr });
      } else {
        onProgress?.({ phase: "error", message: `Command failed with exit code ${code}` });
        reject(
          new BrewCommandError(`brew ${cmd} failed with exit code ${code}`, {
            command: cmd,
            exitCode: code ?? undefined,
            stderr,
          }),
        );
      }
    });

    proc.on("error", (err) => {
      onProgress?.({ phase: "error", message: err.message });
      reject(err);
    });
  });
}
