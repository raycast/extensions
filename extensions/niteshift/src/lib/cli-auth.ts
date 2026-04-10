// src/lib/cli-auth.ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getEnvironmentConfig, type Environment } from "./env";

export interface CliAuth {
  token: string;
  email: string;
  expiresAt: Date;
}

interface RawAuthEntry {
  token: string;
  userId: string;
  email: string;
  authenticatedAt: string;
  expiresAt: string;
}

interface ProfileAuthFile {
  version: "2";
  profiles: {
    prod?: RawAuthEntry;
    dev?: RawAuthEntry;
  };
}

function getConfigHome(): string {
  if (process.env.NITESHIFT_CONFIG_HOME) {
    return process.env.NITESHIFT_CONFIG_HOME;
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "niteshift");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "niteshift");
}

export function getAuthFilePath(env: Environment): string {
  const filename = env === "prod" ? "cli-auth.json" : `cli-auth-${env}.json`;
  return path.join(getConfigHome(), filename);
}

export function getAuthCommand(env: Environment): string {
  if (env === "prod") return "niteshift auth";
  return `niteshift --env ${env} auth`;
}

/**
 * Build the `niteshift pickup <id>` CLI invocation for the given environment.
 * Used by List Tasks's pickup actions to copy a runnable command to the
 * user's clipboard.
 */
export function getPickupCommand(
  env: Environment,
  taskId: string,
  options?: { resume?: boolean },
): string {
  const prefix = env === "prod" ? "niteshift" : `niteshift --env ${env}`;
  const suffix = options?.resume ? " --resume" : "";
  return `${prefix} pickup ${taskId}${suffix}`;
}

/**
 * Load the niteshift CLI's auth token for the given environment.
 *
 * Returns null when:
 *   - the file does not exist
 *   - the file is malformed JSON
 *   - the file's version is not "2"
 *   - the expected profile is missing
 *   - the token has expired
 *
 * Never throws.
 */
export function loadCliAuth(env: Environment): CliAuth | null {
  const filePath = getAuthFilePath(env);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  let parsed: ProfileAuthFile;
  try {
    parsed = JSON.parse(raw) as ProfileAuthFile;
  } catch {
    return null;
  }

  if (parsed.version !== "2" || !parsed.profiles) {
    return null;
  }

  // CLI quirk: the profile key is "prod" or "dev" only — staging reads
  // the "prod" profile out of cli-auth-staging.json. See env.ts.
  const profileKey = getEnvironmentConfig(env).profile;
  const entry = parsed.profiles[profileKey];
  if (!entry) {
    return null;
  }

  if (typeof entry.token !== "string" || typeof entry.email !== "string") {
    return null;
  }

  const expiresAt = new Date(entry.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return null;
  }

  return {
    token: entry.token,
    email: entry.email,
    expiresAt,
  };
}
