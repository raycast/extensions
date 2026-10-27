import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

export interface GatekeeperHelperResult {
  status:
    | "success"
    | "detected"
    | "confirmation_pending"
    | "not_found"
    | "permission_denied"
    | "trusted"
    | "untrusted"
    | "error";
  appName?: string;
  message: string;
  trusted: boolean;
}

export type HelperCommand = "--activate" | "--detect" | "--check-permission";

/**
 * Safely determines the assets directory across Raycast runtime and standalone test environments.
 */
function getAssetsPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raycastApi = require("@raycast/api");
    if (raycastApi.environment?.assetsPath) {
      return raycastApi.environment.assetsPath;
    }
  } catch {
    // Outside Raycast environment
  }
  return path.resolve(__dirname, "../assets");
}

/**
 * Resolves the path to the gatekeeper-helper executable or falls back to the swift source.
 */
function resolveHelperExecution(): { file: string; baseArgs: string[] } {
  const assetsDir = getAssetsPath();
  const binaryPath = path.join(assetsDir, "gatekeeper-helper");

  if (fs.existsSync(binaryPath)) {
    try {
      fs.accessSync(binaryPath, fs.constants.X_OK);
      return { file: binaryPath, baseArgs: [] };
    } catch {
      // Not executable, fallback to swift
    }
  }

  // Fallback to swift interpreter with source file
  const sourcePath = path.resolve(__dirname, "gatekeeper_helper.swift");
  if (fs.existsSync(sourcePath)) {
    return { file: "/usr/bin/swift", baseArgs: [sourcePath] };
  }

  // Last resort: check binary relative to __dirname
  const localBinary = path.resolve(__dirname, "../assets/gatekeeper-helper");
  if (fs.existsSync(localBinary)) {
    return { file: localBinary, baseArgs: [] };
  }

  return { file: binaryPath, baseArgs: [] };
}

/**
 * Runs the Gatekeeper automation helper with the specified mode.
 * Automatically parses JSON output and handles process errors.
 */
export async function runGatekeeperHelper(
  mode: HelperCommand = "--activate",
  targetApp?: string,
  timeoutMs = 8000,
): Promise<GatekeeperHelperResult> {
  const { file, baseArgs } = resolveHelperExecution();
  const args = [...baseArgs, mode];
  if (targetApp) {
    args.push("--target", targetApp);
  }

  try {
    const { stdout } = await execFileAsync(file, args, { timeout: timeoutMs });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return {
        status: "error",
        message: "No response from gatekeeper helper.",
        trusted: false,
      };
    }

    const parsed: GatekeeperHelperResult = JSON.parse(trimmed);
    return parsed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: `Failed to execute gatekeeper helper: ${errorMsg}`,
      trusted: false,
    };
  }
}
