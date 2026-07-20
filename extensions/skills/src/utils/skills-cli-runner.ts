import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { basename } from "node:path";
import { getCustomNpxPath, shouldDisableSkillsCliTelemetry } from "../preferences";
import { execFileAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";

const isWindows = process.platform === "win32";

let validatedCustomNpxPath: string | null = null;
let pendingCustomNpxValidation: { path: string; promise: Promise<void> } | null = null;
let pendingSkillsCliRun: Promise<unknown> = Promise.resolve();
let bunxResolutionFailed = false;

type ExecFailure = Error & {
  code?: string | number;
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

export async function runSkillsCli(args: string[]): Promise<string> {
  return enqueueSkillsCliRun(() => runSkillsCliCommand(args));
}

async function enqueueSkillsCliRun<T>(run: () => Promise<T>): Promise<T> {
  const runAfterPending = pendingSkillsCliRun.then(run, run);
  pendingSkillsCliRun = runAfterPending.catch(() => undefined);
  return runAfterPending;
}

async function runSkillsCliCommand(args: string[]): Promise<string> {
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
      if (!isNpxCommandResolutionFailure(error, "bunx")) {
        throw normalizeCliError(error, "bunx");
      }
      bunxResolutionFailed = true;
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

function normalizeCliError(error: unknown, npxCommand: string): Error {
  if (isNpxCommandResolutionFailure(error, npxCommand)) {
    return new NpxResolutionError(
      "Unable to find a working bunx or npx command. Install Bun, or install Node.js/npm. If you need to force a custom npx executable, set it in the extension configuration under 'Custom npx Path'.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Failed to execute the skills CLI command.");
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
