/**
 * Homebrew command execution utilities.
 *
 * Provides functions for executing brew commands with proper error handling.
 *
 * Targets Homebrew 6.0 and later.
 *
 * Download concurrency is enabled by default (HOMEBREW_DOWNLOAD_CONCURRENCY=auto);
 * the extension exposes a preference to turn it off.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { constants as fs_constants } from "fs";
import * as fs from "fs/promises";
import { join as path_join } from "path";
import { environment } from "@raycast/api";
import { ExecError, ExecResult } from "../types";
import { brewExecutable, brewPath } from "./paths";
import { preferences } from "../preferences";
import { brewLogger } from "../logger";
import { BrewLockError, isBrewLockMessage } from "../errors";
import { bundleIdentifier } from "../cache";

const execp = promisify(exec);

// Track if we've logged the Homebrew environment configuration
let homebrewEnvLogged = false;

/**
 * Execute a brew command.
 *
 * With `raw`, `cmd` is already a complete shell command line (Doctor's
 * `sudo chown …` remediations) and runs verbatim instead of being prefixed with
 * the resolved brew executable.
 */
export async function execBrew(
  cmd: string,
  options?: { signal?: AbortSignal; env?: NodeJS.ProcessEnv; raw?: boolean },
): Promise<ExecResult> {
  try {
    // Caller overrides win: a read-only command can set HOMEBREW_NO_AUTO_UPDATE
    // without changing what every other command in the extension runs with.
    const env = { ...(await execBrewEnv()), ...options?.env };
    if (options?.raw) {
      // execBrewEnv doesn't set PATH; without this, a bare "brew …" inside a
      // remediation resolves off whatever's inherited instead of the configured
      // install (customBrewPath), the way brewExecutable() does below.
      env.PATH = `${brewPath("bin")}:${env.PATH ?? ""}`;
    }
    return await execp(options?.raw ? cmd : `${brewExecutable()} ${cmd}`, {
      signal: options?.signal,
      env,
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

    // Check for brew not found. Only for commands the extension actually ran
    // the brew executable for: a raw remediation's 127 is its OWN missing
    // binary (a missing `sudo`), and claiming brew is missing would be a lie.
    if (!options?.raw && preferences.customBrewPath && execErr?.code === 127) {
      execErr.stderr = `Brew executable not found at: ${preferences.customBrewPath}`;
      throw execErr;
    }

    throw err;
  }
}

/**
 * Run a `--json` brew command that signals "I found something" by exiting 1
 * with the report already on stdout. Returns that run's output, carrying
 * brew's own `ExecError` so a caller can prefer brew's message to a parse
 * error. Any other failure rethrows.
 */
export async function execBrewJson(
  cmd: string,
  options?: { signal?: AbortSignal },
): Promise<ExecResult & { exitError?: ExecError }> {
  try {
    return await execBrew(cmd, options);
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1 && execErr.stdout?.trim()) {
      return { stdout: execErr.stdout, stderr: execErr.stderr, exitError: execErr };
    }
    throw err;
  }
}

/**
 * Get the environment variables for brew execution.
 *
 * Homebrew environment variables:
 * - HOMEBREW_DOWNLOAD_CONCURRENCY: Controls parallel downloads (default: "auto")
 *   Set to "1" to disable concurrent downloads
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
  // Only commands that open a URL read this (brew execs it directly), and the
  // extension never invokes one — which is the reason this is safe.
  env["HOMEBREW_BROWSER"] = bundleIdentifier;

  // Control download concurrency. Homebrew enables concurrent downloads by
  // default (auto); users can disable this via preferences if it causes trouble.
  const downloadConcurrencyDisabled = preferences.disableDownloadConcurrency;
  if (downloadConcurrencyDisabled) {
    env["HOMEBREW_DOWNLOAD_CONCURRENCY"] = "1";
  }

  // Log the Homebrew configuration once per session
  if (!homebrewEnvLogged) {
    homebrewEnvLogged = true;
    brewLogger.log("Homebrew Configuration", {
      downloadConcurrencyEnabled: !downloadConcurrencyDisabled,
      downloadConcurrencyMode: downloadConcurrencyDisabled ? "sequential (1)" : "parallel (auto)",
      verboseLogging: preferences.verboseLogging,
    });
  }

  return env;
}
