import { execFile } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { CliError, CliUnavailableError, parseCliError } from "./errors";

const execFileAsync = promisify(execFile);

const BIN_DIR = path.join(os.homedir(), ".skills-manager", "bin");
const BINARY_NAME = "skills-manager-cli";

/**
 * Raycast spawns extensions with a minimal PATH that misses the directories a
 * hand-installed CLI usually lands in, so probe these explicitly.
 */
const EXTRA_PATH_DIRS = [
  path.join(os.homedir(), ".cargo", "bin"),
  path.join(os.homedir(), ".local", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
];

export type CliResolution =
  | { status: "ok"; path: string; origin: "preference" | "app" | "path" }
  | { status: "bridge_broken"; binDir: string }
  | { status: "not_installed" };

let cached: CliResolution | undefined;

function isExecutable(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function hasVersionStamp(stampPath: string): boolean {
  try {
    return readFileSync(stampPath, "utf8").trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Locates the CLI, mirroring the resolution order the upstream project
 * documents in `skills/manage-skills/SKILL.md`.
 *
 * The copy under `~/.skills-manager/bin` is published by the desktop app, and
 * the `.version` stamp is only written once that copy has been verified — so a
 * stamped binary always matches the app the user is running, and is preferred.
 *
 * A stamp without a binary (or a binary without a stamp) is what a half-finished
 * publish leaves behind. We report `bridge_broken` and deliberately do NOT fall
 * back to PATH: that copy could predate a safety fix while a desktop app of an
 * unknown version is installed. Only when nothing was ever published here is a
 * PATH binary safe to use — there is no stale app copy to disagree with it.
 */
export function resolveCli(): CliResolution {
  if (cached) return cached;

  const { cliPath } = getPreferenceValues<{ cliPath?: string }>();
  const override = cliPath?.trim();
  if (override) {
    const expanded = override.startsWith("~") ? path.join(os.homedir(), override.slice(1)) : override;
    cached = isExecutable(expanded)
      ? { status: "ok", path: expanded, origin: "preference" }
      : { status: "not_installed" };
    return cached;
  }

  const published = path.join(BIN_DIR, BINARY_NAME);
  const stamped = hasVersionStamp(path.join(BIN_DIR, ".version"));
  const binaryPresent = existsSync(published);

  if (stamped && isExecutable(published)) {
    cached = { status: "ok", path: published, origin: "app" };
    return cached;
  }
  if (stamped || binaryPresent) {
    cached = { status: "bridge_broken", binDir: BIN_DIR };
    return cached;
  }

  const searchDirs = [...(process.env.PATH?.split(path.delimiter) ?? []), ...EXTRA_PATH_DIRS];
  for (const dir of searchDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, BINARY_NAME);
    if (isExecutable(candidate)) {
      cached = { status: "ok", path: candidate, origin: "path" };
      return cached;
    }
  }

  cached = { status: "not_installed" };
  return cached;
}

/** Forgets the cached resolution so a "Try Again" action can re-probe the disk. */
export function forgetCliResolution(): void {
  cached = undefined;
}

export interface RunOptions {
  /** Milliseconds. Raised for commands that clone git repositories. */
  timeout?: number;
  signal?: AbortSignal;
}

/** Commands that hit the network (clone, re-clone, marketplace queries) need room. */
export const NETWORK_TIMEOUT = 180_000;
const DEFAULT_TIMEOUT = 30_000;

/**
 * Runs the CLI in JSON mode and returns the parsed payload.
 *
 * `--json` goes before the subcommand because it is a global flag. Arguments are
 * passed as an array to `execFile`, so no shell is involved and user-supplied
 * refs, paths and tag names need no quoting.
 */
export async function runCli<T>(args: string[], options: RunOptions = {}): Promise<T> {
  const resolution = resolveCli();
  if (resolution.status !== "ok") {
    throw new CliUnavailableError(resolution.status === "bridge_broken" ? "bridge_broken" : "not_installed");
  }

  try {
    const { stdout } = await execFileAsync(resolution.path, ["--json", ...args], {
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      signal: options.signal,
      maxBuffer: 32 * 1024 * 1024,
      encoding: "utf8",
    });
    const trimmed = stdout.trim();
    // Mutating commands such as `agents enable` succeed silently.
    if (!trimmed) return undefined as T;
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw normalizeExecError(error, args);
  }
}

function normalizeExecError(error: unknown, args: string[]): Error {
  if (error instanceof CliUnavailableError || error instanceof CliError) return error;

  const execError = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string; killed?: boolean };

  if (execError?.name === "AbortError" || execError?.code === "ABORT_ERR") {
    return execError as Error;
  }
  if (execError?.killed) {
    return new CliError(
      "TIMEOUT",
      `\`${args.join(" ")}\` timed out. The Skills Manager app may be holding the repository lock.`,
      execError.stderr ?? "",
    );
  }
  if (typeof execError?.stderr === "string" && execError.stderr.trim()) {
    return parseCliError(execError.stderr, `\`${args.join(" ")}\` failed`);
  }
  if (error instanceof SyntaxError) {
    return new CliError("BAD_OUTPUT", "The CLI returned output that is not valid JSON.", execError?.stdout ?? "");
  }
  return new CliError("UNKNOWN", execError?.message ?? "The CLI failed for an unknown reason.", "");
}
