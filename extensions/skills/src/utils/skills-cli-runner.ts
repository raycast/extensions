import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join } from "node:path";
import { environment } from "@raycast/api";
import lockfile from "proper-lockfile";
import { getCustomNpxPath, shouldDisableSkillsCliTelemetry } from "../preferences";
import { execFileAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";

const isWindows = process.platform === "win32";

let validatedCustomNpxPath: string | null = null;
let pendingCustomNpxValidation: { path: string; promise: Promise<void> } | null = null;
let pendingSkillsCliRun: Promise<unknown> = Promise.resolve();
let bunxResolutionFailed = false;

const SKILLS_CLI_LOCK_TARGET = join(environment.supportPath, "skills-cli");

type ExecFailure = Error & {
  code?: string | number;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};

type PackageRunner = "npx" | "bunx";

export class NpxResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NpxResolutionError";
  }
}

export function isNpxResolutionError(error: unknown): boolean {
  return error instanceof NpxResolutionError;
}

export class InvalidCustomNpxPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCustomNpxPathError";
  }
}

export function isInvalidCustomNpxPathError(error: unknown): boolean {
  return error instanceof InvalidCustomNpxPathError;
}

function getRunnerArgs(runner: PackageRunner, args: string[]): string[] {
  const packageArgs = runner === "npx" ? ["-y", "skills@latest"] : ["--silent", "skills@latest"];
  return [...packageArgs, ...args];
}

function getSkillsCliEnvOverrides(): Record<string, string> {
  return shouldDisableSkillsCliTelemetry() ? { DISABLE_TELEMETRY: "1" } : {};
}

export interface RunSkillsCliOptions {
  /**
   * Whether the command has no side effects. Only such commands are retried
   * through npx when bunx dies without a word: a mutating command may already
   * have changed local state, and re-running it would apply the change twice.
   */
  readOnly?: boolean;
}

export type SkillsCliRunner = (args: string[], options?: RunSkillsCliOptions) => Promise<string>;

export async function runSkillsCli(args: string[], options: RunSkillsCliOptions = {}): Promise<string> {
  return withSkillsCliLock((runLocked) => runLocked(args, options));
}

export async function withSkillsCliLock<T>(run: (runLocked: SkillsCliRunner) => Promise<T>): Promise<T> {
  return enqueueSkillsCliRun(() =>
    withCrossProcessSkillsCliLock(() =>
      run((args, options = {}) => runSkillsCliCommand(args, options.readOnly ?? false)),
    ),
  );
}

async function enqueueSkillsCliRun<T>(run: () => Promise<T>): Promise<T> {
  const runAfterPending = pendingSkillsCliRun.then(run, run);
  pendingSkillsCliRun = runAfterPending.catch(() => undefined);
  return runAfterPending;
}

async function withCrossProcessSkillsCliLock<T>(run: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(SKILLS_CLI_LOCK_TARGET, "", { flag: "a" });
  const release = await lockfile.lock(SKILLS_CLI_LOCK_TARGET, {
    retries: { forever: true, factor: 1, minTimeout: 100, maxTimeout: 100, randomize: true },
  });
  try {
    return await run();
  } finally {
    await release();
  }
}

async function runSkillsCliCommand(args: string[], readOnly: boolean): Promise<string> {
  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    await validateCustomNpxPath(customNpxPath);
    try {
      return await executeSkillsCli("npx", args, customNpxPath);
    } catch (error) {
      throw normalizeCliError(error, customNpxPath);
    }
  }

  if (!bunxResolutionFailed) {
    try {
      return await executeSkillsCli("bunx", args);
    } catch (error) {
      if (isNpxCommandResolutionFailure(error, "bunx")) {
        bunxResolutionFailed = true;
      } else if (!readOnly || hasDiagnosticOutput(error)) {
        // Either the command may have changed state, or bunx said what went
        // wrong — in both cases retrying through npx is not the right move.
        throw normalizeCliError(error, "bunx");
      }
    }
  }

  try {
    return await executeSkillsCli("npx", args);
  } catch (npxError) {
    throw normalizeCliError(npxError, "npx");
  }
}

async function executeSkillsCli(runner: PackageRunner, args: string[], executable: string = runner): Promise<string> {
  const execOptions = await getExecOptions();
  const env = {
    ...execOptions.env,
    ...getSkillsCliEnvOverrides(),
  };

  const { stdout } = await execFileAsync(executable, getRunnerArgs(runner, args), {
    ...execOptions,
    env,
    shell: isWindows,
  });
  return stdout.toString();
}

const MAX_CLI_OUTPUT_CHARS = 500;

// Built from a char code so the escape byte stays out of the regex literal.
const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");

/**
 * What the failed run told us. The skills CLI renders everything — including
 * errors — on stdout, so stderr alone would usually be empty.
 */
function extractCliOutput(error: unknown): string {
  const failure = error as ExecFailure | undefined;

  return [failure?.stdout, failure?.stderr]
    .map((stream) => stream?.toString().replace(ANSI_ESCAPE_PATTERN, "").trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

/**
 * `bunx --silent` suppresses bun's own diagnostics, so a failed run can reject
 * with nothing beyond "Command failed: bunx …" on either stream. Only such a
 * wordless failure is worth retrying through npx.
 */
function hasDiagnosticOutput(error: unknown): boolean {
  return extractCliOutput(error).length > 0;
}

function normalizeCliError(error: unknown, npxCommand: string): Error {
  if (isNpxCommandResolutionFailure(error, npxCommand)) {
    return new NpxResolutionError(
      "Unable to find a working bunx or npx command. Install Bun, or install Node.js/npm. If you need to force a custom npx executable, set it in the extension configuration under 'Custom npx Path'.",
    );
  }

  if (error instanceof Error) {
    return withCliOutput(error);
  }

  return new Error("Failed to execute the skills CLI command.");
}

/**
 * `execFile` folds stderr into the rejection message but drops stdout, which is
 * where this CLI reports its failures. Without it the user only sees the command
 * that failed, never the reason.
 */
function withCliOutput(error: Error): Error {
  const output = extractCliOutput(error);
  if (!output || error.message.includes(output)) return error;

  const truncated = output.length > MAX_CLI_OUTPUT_CHARS ? `…${output.slice(-MAX_CLI_OUTPUT_CHARS)}` : output;
  const detailedError = new Error(`${error.message.trim()}\n${truncated}`, { cause: error });
  detailedError.name = error.name;
  detailedError.stack = error.stack;
  return detailedError;
}

async function validateCustomNpxPath(customNpxPath: string): Promise<void> {
  if (validatedCustomNpxPath === customNpxPath) {
    return;
  }

  if (pendingCustomNpxValidation?.path === customNpxPath) {
    return pendingCustomNpxValidation.promise;
  }

  const validationPromise = assertValidCustomNpxPath(customNpxPath);
  pendingCustomNpxValidation = { path: customNpxPath, promise: validationPromise };

  try {
    await validationPromise;
    validatedCustomNpxPath = customNpxPath;
  } finally {
    if (pendingCustomNpxValidation?.path === customNpxPath) {
      pendingCustomNpxValidation = null;
    }
  }
}

async function assertValidCustomNpxPath(customNpxPath: string): Promise<void> {
  const invalidPathMessage =
    "The configured Custom npx Path is incorrect. It must point to the `npx` executable. Update the path in the extension configuration or clear it to use automatic detection.";

  const executableNames = isWindows ? new Set(["npx", "npx.cmd", "npx.exe"]) : new Set(["npx"]);
  if (!executableNames.has(basename(customNpxPath).toLowerCase())) {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }

  let fileStats;
  try {
    fileStats = await stat(customNpxPath);
  } catch {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }
  if (fileStats.isDirectory()) {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }

  if (!isWindows) {
    try {
      await access(customNpxPath, constants.X_OK);
    } catch {
      throw new InvalidCustomNpxPathError(invalidPathMessage);
    }
  }
}

function isNpxCommandResolutionFailure(error: unknown, npxCommand: string): boolean {
  const failure = error as ExecFailure | undefined;
  const code = typeof failure?.code === "string" || typeof failure?.code === "number" ? String(failure.code) : "";
  const details = [failure?.message, failure?.stderr?.toString()]
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase();
  const normalizedNpxCommand = npxCommand.toLowerCase();
  const commandBase = basename(normalizedNpxCommand).replace(/\.(cmd|exe)$/, "");
  const windowsCommandNotFound = `'${commandBase}' is not recognized as an internal or external command`;
  const windowsCommandNotFoundQuoted = `'"${commandBase}"' is not recognized as an internal or external command`;

  const mentionsCommand =
    details.includes(`spawn ${normalizedNpxCommand} `) ||
    details.includes(`spawn ${commandBase} `) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound) ||
    details.includes(windowsCommandNotFoundQuoted);

  const npxShimModuleNotFound =
    commandBase === "npx" &&
    details.includes("cannot find module") &&
    (details.includes("npm-prefix.js") || details.includes("npx-cli.js"));

  return (
    (code === "ENOENT" && mentionsCommand) ||
    npxShimModuleNotFound ||
    details.includes(`spawn ${normalizedNpxCommand} enoent`) ||
    details.includes(`spawn ${commandBase} enoent`) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound) ||
    details.includes(windowsCommandNotFoundQuoted)
  );
}
