import { Cache, getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const cache = new Cache();
const SHELL_ENV_CACHE_KEY = "login-shell-env-v2";
const SHELL_ENV_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const shellEnvCacheSchema = z.object({
  savedAt: z.number(),
  env: z.record(z.string(), z.string()),
  /** True when the shell exported tokens; those are never written to disk, so a fresh probe is needed per run. */
  hasSecrets: z.boolean().optional(),
});
// Secrets from the login shell live only in memory for the current command run, never in Raycast's on-disk cache.
const SECRET_ENV_NAMES = new Set(["GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GITHUB_ENTERPRISE_TOKEN"]);
let memoryEnv: Record<string, string> | undefined;
let inFlight: Promise<Record<string, string>> | undefined;
let environmentGeneration = 0;
cache.remove("login-shell-path");

const FALLBACK_PATH_ENTRIES = [
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  join(homedir(), ".local/bin"),
  join(homedir(), ".local/share/mise/shims"),
  join(homedir(), ".asdf/shims"),
  join(homedir(), ".volta/bin"),
  join(homedir(), ".bun/bin"),
  join(homedir(), ".npm-global/bin"),
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
];

type ExecResult = { stdout: string; stderr: string };

export class CommandError extends Error {
  constructor(
    message: string,
    readonly stdout: string,
    readonly stderr: string,
    readonly notFound: boolean,
  ) {
    super(message);
    this.name = "CommandError";
  }

  /** Everything the command printed, for showing in full. */
  get output(): string {
    return (
      [this.stdout, this.stderr]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("\n\n") || this.message
    );
  }
}

const ANSI_PATTERN = new RegExp(String.raw`\u001b\[[0-9;?]*[ -/]*[@-~]`, "g");

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

const SHELL_ENV_NAMES = new Set([
  "PATH",
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "GH_HOST",
  "GH_CONFIG_DIR",
  "GH_ENTERPRISE_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "XDG_CONFIG_HOME",
]);

/** Extracts only supported environment variables from a complete login-shell probe. */
export function parseShellEnv(stdout: string, marker: string): Record<string, string> | undefined {
  if (!marker) return undefined;
  const start = stdout.indexOf(marker);
  if (start === -1) return undefined;
  const end = stdout.indexOf(marker, start + marker.length);
  if (end === -1) return undefined;

  const env: Record<string, string> = {};
  for (const line of stdout.slice(start + marker.length, end).split("\n")) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const name = line.slice(0, separator);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && SHELL_ENV_NAMES.has(name)) {
      env[name] = line.slice(separator + 1);
    }
  }
  return env;
}

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

function exec(
  file: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number },
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { ...options, maxBuffer: 32 * 1024 * 1024, encoding: "utf8" },
      (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          const notFound = errorCode(error) === "ENOENT";
          const output = stripAnsi(stderr || stdout).trim();
          reject(new CommandError(output || error.message, stripAnsi(stdout), stripAnsi(stderr), notFound));
          return;
        }
        resolve({ stdout: stripAnsi(stdout), stderr: stripAnsi(stderr) });
      },
    );
  });
}

/** Ignore stdin so shell startup prompts see EOF; retain complete output even if startup later hangs. */
function probeLoginShell(): Promise<Record<string, string> | undefined> {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || "/bin/zsh";
    const marker = "__RAYCAST_GRAPHITE_ENV__";
    try {
      const child = spawn(shell, ["-ilc", `echo ${marker}; /usr/bin/env; echo ${marker}`], {
        env: { HOME: homedir(), USER: process.env.USER, SHELL: shell, TERM: "dumb" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let settled = false;
      const finish = (env: Record<string, string> | undefined) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(env);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(parseShellEnv(stdout, marker));
      }, 10_000);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.resume();
      child.on("error", () => finish(undefined));
      child.on("close", () => finish(parseShellEnv(stdout, marker)));
    } catch {
      resolve(undefined);
    }
  });
}

function withFallbackPath(env: Record<string, string>): Record<string, string> {
  const entries = [...(env.PATH ?? "").split(":"), ...(process.env.PATH ?? "").split(":"), ...FALLBACK_PATH_ENTRIES];
  return { ...env, PATH: [...new Set(entries.filter(Boolean))].join(":") };
}

/** Refresh command discovery after a missing executable, including any pending probe. */
export function resetShellEnvironment(): void {
  cache.remove(SHELL_ENV_CACHE_KEY);
  inFlight = undefined;
  memoryEnv = undefined;
  environmentGeneration += 1;
}

/** Raycast needs the login shell's PATH and GitHub configuration, shared across concurrent callers. */
async function shellEnvironment(): Promise<Record<string, string>> {
  if (memoryEnv) return withFallbackPath(memoryEnv);
  if (inFlight) return inFlight;
  const cached = cache.get(SHELL_ENV_CACHE_KEY);
  if (cached) {
    try {
      const parsed = shellEnvCacheSchema.safeParse(JSON.parse(cached));
      if (
        parsed.success &&
        !parsed.data.hasSecrets &&
        Date.now() - parsed.data.savedAt < SHELL_ENV_CACHE_TTL_MS &&
        "PATH" in parsed.data.env
      ) {
        const env = Object.fromEntries(Object.entries(parsed.data.env).filter(([name]) => SHELL_ENV_NAMES.has(name)));
        return withFallbackPath(env);
      }
    } catch {
      // Malformed cache entries should trigger a fresh probe.
    }
  }

  const generation = environmentGeneration;
  const pending = (async () => {
    const env = await probeLoginShell();
    // A reset must also prevent an older probe from repopulating the cache.
    if (env && "PATH" in env && generation === environmentGeneration) {
      memoryEnv = env;
      const publicEnv = Object.fromEntries(Object.entries(env).filter(([name]) => !SECRET_ENV_NAMES.has(name)));
      const hasSecrets = Object.keys(env).some((name) => SECRET_ENV_NAMES.has(name));
      cache.set(SHELL_ENV_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), env: publicEnv, hasSecrets }));
    }
    return withFallbackPath(env ?? {});
  })();
  inFlight = pending;
  try {
    return await pending;
  } finally {
    if (inFlight === pending) inFlight = undefined;
  }
}

/** A variable from the user's login shell (allowlisted names only), for settings Raycast doesn't inherit. */
export async function shellVariable(name: string): Promise<string | undefined> {
  return (await shellEnvironment())[name];
}

async function commandEnv(): Promise<NodeJS.ProcessEnv> {
  return {
    ...process.env,
    ...(await shellEnvironment()),
    // keep output machine friendly
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function executable(configuredPath: string | undefined, fallback: string): string {
  const trimmed = configuredPath?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("~/") ? join(homedir(), trimmed.slice(2)) : trimmed;
}

function gtExecutable(): string {
  return executable(getPreferenceValues<Preferences>().gtPath, "gt");
}

function ghExecutable(): string {
  return executable(getPreferenceValues<Preferences>().ghPath, "gh");
}

/**
 * Runs a Graphite CLI command inside a repository. Interactive prompts are always disabled.
 * Running inside the repository also lets version managers such as mise resolve per-project `gt` versions.
 */
export async function runGt(args: string[], cwd: string, timeout = 5 * 60_000): Promise<ExecResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await stat(cwd);
    } catch {
      throw new CommandError(
        `The repository folder ${cwd} no longer exists. Update "Repository Folders" in the extension preferences.`,
        "",
        "",
        false,
      );
    }
    try {
      return await exec(gtExecutable(), [...args, "--no-interactive"], { cwd, env: await commandEnv(), timeout });
    } catch (error) {
      if (error instanceof CommandError && error.notFound) {
        if (attempt === 0) {
          resetShellEnvironment();
          continue;
        }
        throw new CommandError(
          "Could not find the Graphite CLI (`gt`). Install it or set its path in the extension preferences.",
          error.stdout,
          error.stderr,
          true,
        );
      }
      throw error;
    }
  }
}

/**
 * Runs a GitHub CLI command. `gh` supplies GitHub access (reviews, comments, checks) with the user's own login,
 * including the supported authentication variables from the user's login shell.
 */
export async function runGh(args: string[], timeout = 60_000): Promise<ExecResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await exec(ghExecutable(), args, {
        cwd: homedir(),
        // Graphite only works with GitHub.com, so an enterprise GH_HOST from the shell must not redirect requests.
        env: { ...(await commandEnv()), GH_HOST: "github.com", GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1" },
        timeout,
      });
    } catch (error) {
      if (error instanceof CommandError && error.notFound) {
        if (attempt === 0) {
          resetShellEnvironment();
          continue;
        }
        throw new CommandError(
          "Could not find the GitHub CLI (`gh`). Install it or set its path in the extension preferences.",
          error.stdout,
          error.stderr,
          true,
        );
      }
      throw error;
    }
  }
}

/** Picks the most useful line(s) of CLI output for a toast. */
export function summarizeOutput(output: string, maxLines = 3): string {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-maxLines).join("\n");
}
