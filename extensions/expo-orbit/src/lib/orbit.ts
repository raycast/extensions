import { getApplications } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { getAndroidSdkPath } from "./settings";

const execFileAsync = promisify(execFile);

export const ORBIT_BUNDLE_ID = "dev.expo.orbit";
export const ORBIT_DOWNLOAD_URL = "https://expo.dev/orbit";

const RETURN_OUTPUT_MARKER = "---- return output ----";
const THROWN_ERROR_MARKER = "---- thrown error ----";

/** An error reported by the Orbit CLI. `code` is set for Orbit's own errors, e.g. `UNTRUSTED_SOURCE`. */
export class OrbitError extends Error {
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "OrbitError";
    this.code = code;
    this.details = details;
  }
}

/** Thrown when Expo Orbit isn't installed, so views can show the install screen instead of a toast. */
export class OrbitNotInstalledError extends Error {
  constructor() {
    super("Expo Orbit is not installed");
    this.name = "OrbitNotInstalledError";
  }
}

/** Thrown when the installed Expo Orbit is too old for a command. */
export class OrbitUnsupportedCommandError extends Error {
  constructor(command: string) {
    super(`Your version of Expo Orbit doesn't support "${command}". Update Expo Orbit and try again.`);
    this.name = "OrbitUnsupportedCommandError";
  }
}

let cachedAppPath: string | undefined;

/** The path of Expo Orbit.app, looked up by its bundle identifier so a custom install location works. */
export async function getOrbitAppPath(): Promise<string | undefined> {
  if (cachedAppPath && existsSync(cachedAppPath)) {
    return cachedAppPath;
  }
  const applications = await getApplications();
  const orbit = applications.find((application) => application.bundleId === ORBIT_BUNDLE_ID);
  if (orbit) {
    cachedAppPath = orbit.path;
    return orbit.path;
  }
  const fallback = "/Applications/Expo Orbit.app";
  return existsSync(fallback) ? fallback : undefined;
}

async function getCliPath(): Promise<string> {
  const appPath = await getOrbitAppPath();
  if (!appPath) {
    throw new OrbitNotInstalledError();
  }
  const resources = path.join(appPath, "Contents", "Resources");
  const preferred = path.join(resources, process.arch === "arm64" ? "orbit-cli-arm64" : "orbit-cli-x64");
  if (existsSync(preferred)) {
    return preferred;
  }
  const other = path.join(resources, process.arch === "arm64" ? "orbit-cli-x64" : "orbit-cli-arm64");
  if (existsSync(other)) {
    return other;
  }
  throw new OrbitNotInstalledError();
}

const envVarsSchema = z.record(z.string(), z.string());

/**
 * Environment variables set in Expo Orbit's settings (for example `ANDROID_HOME`). The menu bar app
 * passes them to every CLI run, so the extension does the same.
 */
async function getOrbitEnvVars(): Promise<Record<string, string>> {
  const plist = path.join(homedir(), "Library", "Preferences", `${ORBIT_BUNDLE_ID}.plist`);
  if (!existsSync(plist)) {
    return {};
  }
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-extract", "envVars", "json", "-o", "-", plist]);
    const parsed = envVarsSchema.safeParse(JSON.parse(stdout));
    return parsed.success ? parsed.data : {};
  } catch {
    // The key doesn't exist when no variables are set.
    return {};
  }
}

/** The Android SDK location from the preferences. Expo Orbit's own setting sets `ANDROID_HOME` the same way. */
function getSdkEnv(): Record<string, string> {
  const sdkPath = getAndroidSdkPath();
  return sdkPath ? { ANDROID_HOME: sdkPath, ANDROID_SDK_ROOT: sdkPath } : {};
}

/** The environment Expo Orbit runs its tools with: Raycast's own, plus Orbit's settings and the SDK preference. */
export async function getOrbitEnv(): Promise<NodeJS.ProcessEnv> {
  return { ...process.env, ...(await getOrbitEnvVars()), ...getSdkEnv() };
}

const cliErrorSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  message: z.string(),
  details: z.unknown().optional(),
});

function parseCliError(raw: string): OrbitError {
  try {
    const parsed = cliErrorSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return new OrbitError(parsed.data.message, parsed.data.code, parsed.data.details);
    }
  } catch {
    // Not JSON: use the raw text.
  }
  return new OrbitError(raw.trim() || "Expo Orbit failed without an error message");
}

function isUnknownCommandOutput(output: string): boolean {
  return /unknown command/i.test(output);
}

export type RunOrbitOptions = {
  /** Called with each line the CLI logs while it runs, e.g. download progress. */
  onOutput?: (line: string) => void;
  signal?: AbortSignal;
};

/**
 * Runs a command of the CLI bundled in Expo Orbit and returns its result. The CLI uses the same
 * protocol as Orbit's menu bar: with `EXPO_MENU_BAR` set, it prints a marker and then the result
 * or a JSON error.
 */
export async function runOrbit(command: string, args: string[] = [], options: RunOrbitOptions = {}): Promise<string> {
  const [cliPath, env] = await Promise.all([getCliPath(), getOrbitEnv()]);

  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, [command, ...args], {
      env: { ...env, EXPO_MENU_BAR: "true" },
      signal: options.signal,
    });

    const lines: string[] = [];
    let pending = "";
    const onData = (chunk: Buffer) => {
      pending += chunk.toString("utf8");
      const parts = pending.split(/\r?\n|\r/);
      pending = parts.pop() ?? "";
      for (const line of parts) {
        if (!line) continue;
        lines.push(line);
        if (line !== RETURN_OUTPUT_MARKER && line !== THROWN_ERROR_MARKER) {
          options.onOutput?.(line);
        }
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("error", (error) => reject(error));
    child.on("close", (exitCode) => {
      if (pending) {
        lines.push(pending);
      }
      const errorIndex = lines.indexOf(THROWN_ERROR_MARKER);
      if (errorIndex !== -1) {
        reject(parseCliError(lines.slice(errorIndex + 1).join("\n")));
        return;
      }
      const outputIndex = lines.indexOf(RETURN_OUTPUT_MARKER);
      if (outputIndex !== -1) {
        resolve(lines.slice(outputIndex + 1).join("\n"));
        return;
      }
      const output = lines.join("\n");
      if (isUnknownCommandOutput(output)) {
        reject(new OrbitUnsupportedCommandError(command));
        return;
      }
      if (exitCode === 0) {
        resolve("");
        return;
      }
      reject(new OrbitError(output.trim() || `Expo Orbit exited with code ${exitCode}`));
    });
  });
}

/** Parses the download progress the CLI logs, e.g. `12.3 MB / 45.6 MB`, as a percentage. */
export function parseDownloadProgress(line: string): number | undefined {
  const match = line.match(/(\d+(?:\.\d+)?) MB \/ (\d+(?:\.\d+)?) MB/);
  if (!match) {
    return undefined;
  }
  const total = parseFloat(match[2]);
  return total > 0 ? Math.min(100, (parseFloat(match[1]) / total) * 100) : undefined;
}
