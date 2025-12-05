/**
 * Homebrew progress tracking utilities.
 *
 * Provides functions for executing brew commands with real-time progress updates.
 */

import { spawn } from "child_process";
import { brewExecutable } from "./paths";
import { execBrewEnv } from "./commands";
import { brewLogger } from "../logger";
import { BrewLockError, isBrewLockMessage, BrewCommandError, StaleProcessError } from "../errors";
import { ExecResult } from "../types";

/// Configuration

/**
 * Default timeout for stale process detection (5 minutes).
 * If no progress is made for this duration, the process is considered stuck.
 */
export const DEFAULT_STALE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Timeout for download phase specifically (10 minutes).
 * Downloads can take longer, especially for large packages like LLVM.
 */
export const DOWNLOAD_PHASE_TIMEOUT_MS = 10 * 60 * 1000;

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
 * Options for executing brew commands with progress tracking.
 */
export interface ExecBrewWithProgressOptions {
  /** Callback for progress updates */
  onProgress?: ProgressCallback;
  /** AbortController for cancellation */
  cancel?: AbortController;
  /** Timeout for stale process detection (ms). Default: 5 minutes */
  staleTimeoutMs?: number;
  /** Package name for error context */
  packageName?: string;
  /** Enable detailed phase logging */
  verboseLogging?: boolean;
}

/**
 * Execute a brew command with real-time progress updates and stale process detection.
 *
 * Features:
 * - Real-time progress parsing from stdout/stderr
 * - Stale process detection (kills process if no progress for timeout period)
 * - Detailed phase logging for debugging stuck operations
 * - Lock error detection and proper error handling
 */
export async function execBrewWithProgress(
  cmd: string,
  onProgress?: ProgressCallback,
  cancel?: AbortController,
  options?: Omit<ExecBrewWithProgressOptions, "onProgress" | "cancel">,
): Promise<ExecResult> {
  const env = await execBrewEnv();
  const args = cmd.split(/\s+/).filter(Boolean);
  const staleTimeoutMs = options?.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
  const packageName = options?.packageName;
  const verboseLogging = options?.verboseLogging ?? false;

  brewLogger.log("Executing brew with progress", { command: cmd, packageName, staleTimeoutMs });

  return new Promise((resolve, reject) => {
    const proc = spawn(brewExecutable(), args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let lastProgressTime = Date.now();
    let currentPhase: BrewPhase = "starting";
    let staleCheckInterval: NodeJS.Timeout | null = null;
    let isRejected = false;

    // Helper to clean up and reject
    const cleanup = () => {
      if (staleCheckInterval) {
        clearInterval(staleCheckInterval);
        staleCheckInterval = null;
      }
    };

    const rejectOnce = (error: Error) => {
      if (isRejected) return;
      isRejected = true;
      cleanup();
      proc.kill("SIGTERM");
      reject(error);
    };

    // Stale process detection - check every 30 seconds
    staleCheckInterval = setInterval(() => {
      const now = Date.now();
      const staleDuration = now - lastProgressTime;

      // Use longer timeout for download phase
      const effectiveTimeout = currentPhase === "downloading" ? DOWNLOAD_PHASE_TIMEOUT_MS : staleTimeoutMs;

      if (staleDuration > effectiveTimeout) {
        brewLogger.warn("Stale process detected", {
          command: cmd,
          packageName,
          lastPhase: currentPhase,
          staleDurationMs: staleDuration,
          timeoutMs: effectiveTimeout,
        });

        rejectOnce(
          new StaleProcessError(`Process appears stuck during ${currentPhase}`, {
            packageName,
            lastPhase: currentPhase,
            staleDurationMs: staleDuration,
          }),
        );
      } else if (verboseLogging) {
        brewLogger.log("Stale check passed", {
          command: cmd,
          phase: currentPhase,
          timeSinceLastProgress: staleDuration,
          timeout: effectiveTimeout,
        });
      }
    }, 30000);

    // Handle cancellation
    if (cancel) {
      cancel.signal.addEventListener("abort", () => {
        if (isRejected) return;
        isRejected = true;
        cleanup();
        proc.kill("SIGTERM");
        const error = new Error("Cancelled");
        error.name = "AbortError";
        reject(error);
      });
    }

    // Report starting
    onProgress?.({ phase: "starting", message: `Running: brew ${cmd}` });

    // Helper to process output and update progress
    const processOutput = (text: string, source: "stdout" | "stderr") => {
      lastProgressTime = Date.now();

      const lines = text.split("\n");
      for (const line of lines) {
        const progress = parseBrewOutput(line);
        if (progress) {
          // Track phase transitions for detailed logging
          if (progress.phase !== currentPhase) {
            brewLogger.log("Phase transition", {
              command: cmd,
              packageName,
              from: currentPhase,
              to: progress.phase,
              message: progress.message,
            });
            currentPhase = progress.phase;
          }
          onProgress?.(progress);
        } else if (verboseLogging && line.trim()) {
          // Log unparsed output for debugging
          brewLogger.log(`Unparsed ${source}`, { line: line.trim() });
        }
      }
    };

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      processOutput(text, "stdout");
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // Check for lock errors
      if (isBrewLockMessage(text)) {
        rejectOnce(
          new BrewLockError("Another brew process is already running", {
            command: cmd,
          }),
        );
        return;
      }

      // Parse stderr for progress too (brew outputs some progress to stderr)
      processOutput(text, "stderr");
    });

    proc.on("close", (code) => {
      cleanup();
      if (isRejected) return;

      brewLogger.log("Command completed", {
        command: cmd,
        packageName,
        exitCode: code,
        finalPhase: currentPhase,
      });

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
      cleanup();
      if (isRejected) return;
      onProgress?.({ phase: "error", message: err.message });
      reject(err);
    });
  });
}
