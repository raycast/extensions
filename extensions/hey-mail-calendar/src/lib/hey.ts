import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import os from "os";
import { promisify } from "util";
import { clearAuthVerified } from "./auth-cache";
import type { HeyAuthStatus, HeyEnvelope, Preferences } from "./types";

const execFileAsync = promisify(execFile);

let cachedHeyPath: string | undefined;

export class HeyCliError extends Error {
  constructor(
    message: string,
    readonly command: string,
  ) {
    super(message);
    this.name = "HeyCliError";
  }
}

function execEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: process.env.HOME ?? os.homedir(),
    USER: process.env.USER ?? os.userInfo().username,
    LOGNAME: process.env.LOGNAME ?? os.userInfo().username,
    SHELL: process.env.SHELL ?? "/bin/zsh",
    PATH: process.env.PATH ?? "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
  };
}

function shellEscapeArg(arg: string): string {
  if (/^[A-Za-z0-9._+=:@/-]+$/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function normalizeCliOutput(stdout: string): string {
  return stdout.replace(/\r/g, "").trim();
}

export function getHeyPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.heyPath?.trim() || cachedHeyPath || "/usr/local/bin/hey";
}

export async function resolveHeyPath(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const configured = preferences.heyPath?.trim();
  if (configured) {
    cachedHeyPath = configured;
    return configured;
  }

  if (cachedHeyPath) {
    return cachedHeyPath;
  }

  const candidates = ["/usr/local/bin/hey", "/opt/homebrew/bin/hey", `${os.homedir()}/hey-cli/hey-cli/bin/hey`];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["--version"], { env: execEnv(), timeout: 5000 });
      cachedHeyPath = candidate;
      return candidate;
    } catch {
      // try next candidate
    }
  }

  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-ilc", "command -v hey"], {
      env: execEnv(),
      timeout: 5000,
    });
    const resolved = stdout.trim();
    if (resolved) {
      cachedHeyPath = resolved;
      return resolved;
    }
  } catch {
    // fall through
  }

  cachedHeyPath = "/usr/local/bin/hey";
  return cachedHeyPath;
}

export function parseHeyEnvelope<T>(stdout: string): HeyEnvelope<T> {
  const parsed = JSON.parse(normalizeCliOutput(stdout)) as HeyEnvelope<T>;
  if (!parsed.ok) {
    throw new HeyCliError(parsed.summary ?? "hey command failed", "hey");
  }
  return parsed;
}

async function runHeyRawViaLoginShell(args: string[], timeout: number): Promise<string> {
  const heyPath = await resolveHeyPath();
  const command = [heyPath, ...args].map(shellEscapeArg).join(" ");
  const { stdout } = await execFileAsync("/bin/zsh", ["-ilc", command], {
    timeout,
    maxBuffer: 10 * 1024 * 1024,
    env: execEnv(),
  });
  return normalizeCliOutput(stdout);
}

async function runHeyRawViaAppleScript(args: string[], timeout: number): Promise<string> {
  const heyPath = await resolveHeyPath();
  const command = [heyPath, ...args].map(shellEscapeArg).join(" ");
  const stdout = await runAppleScript(`do shell script ${JSON.stringify(command)}`, {
    timeout,
    parseOutput: ({ stdout: output }) => output,
  });
  return normalizeCliOutput(stdout);
}

async function runHeyRaw(args: string[], timeout: number): Promise<string> {
  const runners = [runHeyRawViaLoginShell, runHeyRawViaAppleScript];
  let lastError: unknown;

  for (const runner of runners) {
    try {
      return await runner(args, timeout);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new HeyCliError("Failed to run hey CLI", `${getHeyPath()} ${args.join(" ")}`);
}

export async function runHey<T>(args: string[], timeout = 30_000): Promise<HeyEnvelope<T>> {
  const commandLabel = `${getHeyPath()} ${args.join(" ")}`;

  try {
    const stdout = await runHeyRaw(args, timeout);
    return parseHeyEnvelope<T>(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run hey CLI";
    const lowered = message.toLowerCase();
    if (lowered.includes("not logged in") || lowered.includes("authenticate") || lowered.includes("unauthorized")) {
      await clearAuthVerified();
    }
    throw new HeyCliError(message, commandLabel);
  }
}

export function parseHeyExecOutput<T>(stdout: string): T {
  return parseHeyEnvelope<T>(stdout).data;
}

async function readAuthStatus(): Promise<{ path: string; status: HeyAuthStatus; summary?: string }> {
  const path = await resolveHeyPath();
  const response = await runHey<HeyAuthStatus>(["auth", "status", "--json"]);
  return { path, status: response.data, summary: response.summary };
}

export async function getAuthStatus(): Promise<{ path: string; status: HeyAuthStatus; summary?: string }> {
  let auth = await readAuthStatus();

  if ((!auth.status.authenticated || auth.status.expired) && auth.status.refresh_available !== false) {
    try {
      await runHey(["auth", "refresh", "--json"]);
      auth = await readAuthStatus();
    } catch {
      // keep original status if refresh fails
    }
  }

  return auth;
}

export async function loginHey(): Promise<void> {
  await runHey(["auth", "login"], 120_000);
}

export async function logoutHey(): Promise<void> {
  await runHey(["auth", "logout"]);
  await clearAuthVerified();
}
