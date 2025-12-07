/**
 * Homebrew command execution utilities.
 *
 * Provides functions for executing brew commands with proper error handling.
 *
 * Homebrew 5.0 Compatibility Notes:
 * - Download concurrency is now enabled by default (HOMEBREW_DOWNLOAD_CONCURRENCY=auto)
 * - The extension supports controlling this via preferences
 * - --no-quarantine and --quarantine flags are deprecated
 * - HOMEBREW_USE_INTERNAL_API can be enabled for the new smaller JSON API
 */

import { exec } from "child_process";
import { promisify } from "util";
import { constants as fs_constants } from "fs";
import * as fs from "fs/promises";
import { join as path_join } from "path";
import { environment } from "@raycast/api";
import { ExecError, ExecResult } from "../types";
import { brewExecutable } from "./paths";
import { preferences } from "../preferences";
import { brewLogger } from "../logger";
import { BrewLockError, isBrewLockMessage } from "../errors";
import { bundleIdentifier } from "../cache";

const execp = promisify(exec);

// Track if we've logged the Homebrew 5.0 environment configuration
let homebrewEnvLogged = false;

/**
 * Execute a brew command.
 */
export async function execBrew(cmd: string, options?: { signal?: AbortSignal }): Promise<ExecResult> {
  try {
    const env = await execBrewEnv();
    return await execp(`${brewExecutable()} ${cmd}`, {
      signal: options?.signal,
      env: env,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    const execErr = err as ExecError;

    // Check for brew lock/concurrent process error
    const errorOutput = execErr?.stderr || execErr?.stdout || "";
    if (isBrewLockMessage(errorOutput)) {
      brewLogger.warn("Brew lock detected - another process is running", {
        command: cmd,
        stderr: execErr?.stderr,
      });
      throw new BrewLockError("Another brew process is already running", {
        command: cmd,
        cause: execErr,
      });
    }

    // Check for brew not found
    if (preferences.customBrewPath && execErr && execErr.code === 127) {
      execErr.stderr = `Brew executable not found at: ${preferences.customBrewPath}`;
      throw execErr;
    }

    throw err;
  }
}

/**
 * Get the environment variables for brew execution.
 *
 * Homebrew 5.0 environment variables:
 * - HOMEBREW_DOWNLOAD_CONCURRENCY: Controls parallel downloads (default: "auto")
 *   Set to "1" to disable concurrent downloads
 * - HOMEBREW_USE_INTERNAL_API: Opt-in to the new smaller internal JSON API
 */
export async function execBrewEnv(): Promise<NodeJS.ProcessEnv> {
  const askpassPath = path_join(environment.assetsPath, "askpass.sh");
  try {
    await fs.access(askpassPath, fs_constants.X_OK);
  } catch {
    await fs.chmod(askpassPath, 0o755);
  }
  const env = { ...process.env };
  env["SUDO_ASKPASS"] = askpassPath;
  // Use HOMEBREW_BROWSER to pass through the app's bundle identifier.
  // Brew will ignore custom environment variables.
  env["HOMEBREW_BROWSER"] = bundleIdentifier;

  // Homebrew 5.0: Control download concurrency
  // By default, Homebrew 5.0 enables concurrent downloads (auto)
  // Users can disable this via preferences if they experience issues
  const downloadConcurrencyDisabled = preferences.disableDownloadConcurrency;
  if (downloadConcurrencyDisabled) {
    env["HOMEBREW_DOWNLOAD_CONCURRENCY"] = "1";
  }

  // Homebrew 5.0: Opt-in to the new internal API (smaller JSON)
  // This will become default in a future version
  const useInternalApi = preferences.useInternalApi;
  if (useInternalApi) {
    env["HOMEBREW_USE_INTERNAL_API"] = "1";
  }

  // Log Homebrew 5.0 configuration once per session
  if (!homebrewEnvLogged) {
    homebrewEnvLogged = true;
    brewLogger.log("Homebrew 5.0 Configuration", {
      downloadConcurrencyEnabled: !downloadConcurrencyDisabled,
      downloadConcurrencyMode: downloadConcurrencyDisabled ? "sequential (1)" : "parallel (auto)",
      internalApiEnabled: useInternalApi,
      verboseLogging: preferences.verboseLogging,
    });
  }

  return env;
}
