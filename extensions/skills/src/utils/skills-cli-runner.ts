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

/**
 * Every run starts by resolving `skills@latest`, which downloads roughly 8 MB
 * on a cold cache, so even read-only `list` needs room for that download on a
 * slow connection. `add`, `remove` and `update` then fetch every involved skill
 * from its git source, and "update all" does so for each installed skill in
 * turn, which is what outgrew the original 30-second budget.
 */
const READ_ONLY_TIMEOUT_MS = 2 * 60_000;
const MUTATING_TIMEOUT_MS = 5 * 60_000;

/**
 * How long a command waits for its turn when another one holds the CLI. A
 * legitimate holder can occupy it for a whole mutating timeout, so the wait has
 * to outlast that; past it the holder is not coming back, and waiting longer is
 * indistinguishable from a hang.
 */
const CLI_TURN_TIMEOUT_MS = MUTATING_TIMEOUT_MS + 30_000;

const LOCK_RETRY_INTERVAL_MS = 100;

type ExecFailure = Error & {
  cmd?: string;
  code?: string | number | null;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
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

export class SkillsCliBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillsCliBusyError";
  }
}

export function isSkillsCliBusyError(error: unknown): boolean {
  return error instanceof SkillsCliBusyError;
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
  const turnDeadline = Date.now() + CLI_TURN_TIMEOUT_MS;
  return enqueueSkillsCliRun(
    () =>
      withCrossProcessSkillsCliLock(
        (lockLost) => run((args, options = {}) => runSkillsCliCommand(args, options.readOnly ?? false, lockLost)),
        turnDeadline,
      ),
    turnDeadline,
  );
}

function skillsCliBusyError(): SkillsCliBusyError {
  return new SkillsCliBusyError("Another skills command is still running. Wait for it to finish and try again.");
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function enqueueSkillsCliRun<T>(run: () => Promise<T>, turnDeadline: number): Promise<T> {
  // Claim the next place in the chain synchronously, so two callers can never
  // wake up on the same predecessor and run at once.
  const predecessor = pendingSkillsCliRun;
  let releasePlace: () => void = () => {};
  pendingSkillsCliRun = new Promise<void>((resolve) => (releasePlace = resolve));

  try {
    await waitForTurn(predecessor, turnDeadline);
  } catch (error) {
    // This run never started, so whoever is next still has to wait for the
    // predecessor rather than for us.
    predecessor.then(releasePlace, releasePlace);
    throw error;
  }

  try {
    return await run();
  } finally {
    releasePlace();
  }
}

async function waitForTurn(predecessor: Promise<unknown>, turnDeadline: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      predecessor.catch(() => undefined),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(skillsCliBusyError()), Math.max(0, turnDeadline - Date.now()));
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function withCrossProcessSkillsCliLock<T>(
  run: (lockLost: AbortSignal) => Promise<T>,
  turnDeadline: number,
): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(SKILLS_CLI_LOCK_TARGET, "", { flag: "a" });
  const lockLost = new AbortController();
  const release = await acquireSkillsCliLock(turnDeadline, lockLost);
  try {
    return await run(lockLost.signal);
  } finally {
    await releaseSkillsCliLock(release);
  }
}

/**
 * Retries only while the lock is genuinely held by someone else. The previous
 * `retries: forever` also retried permanent failures such as a support
 * directory we cannot write to, which could never succeed.
 */
async function acquireSkillsCliLock(turnDeadline: number, lockLost: AbortController): Promise<() => Promise<void>> {
  for (;;) {
    try {
      return await lockfile.lock(SKILLS_CLI_LOCK_TARGET, {
        retries: 0,
        onCompromised: (error) => stopRunOnLostLock(error, lockLost),
      });
    } catch (error) {
      if (!isLockHeldError(error)) throw error;
      if (Date.now() >= turnDeadline) throw skillsCliBusyError();
      await delay(LOCK_RETRY_INTERVAL_MS);
    }
  }
}

function isLockHeldError(error: unknown): boolean {
  return (error as { code?: string } | undefined)?.code === "ELOCKED";
}

/**
 * Losing the lock means another process can now run its own command against the
 * same skills and npx cache, which is the race the lock exists to prevent, so
 * stop our run rather than let two proceed at once. The library default instead
 * throws from a timer callback, which takes the command down without stopping
 * the child process it spawned.
 */
function stopRunOnLostLock(error: Error, lockLost: AbortController): void {
  console.error("[skills] Lost the skills CLI lock while a command was running:", error);
  lockLost.abort();
}

async function releaseSkillsCliLock(release: () => Promise<void>): Promise<void> {
  try {
    await release();
  } catch (error) {
    // A lock that was compromised is already gone, so releasing it fails. That
    // must never replace whatever error the command itself produced.
    console.error("[skills] Failed to release the skills CLI lock:", error);
  }
}

async function runSkillsCliCommand(args: string[], readOnly: boolean, lockLost: AbortSignal): Promise<string> {
  const timeoutMs = readOnly ? READ_ONLY_TIMEOUT_MS : MUTATING_TIMEOUT_MS;

  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    await validateCustomNpxPath(customNpxPath);
    try {
      return await executeSkillsCli("npx", args, timeoutMs, lockLost, customNpxPath);
    } catch (error) {
      throw normalizeCliError(error, customNpxPath, timeoutMs);
    }
  }

  if (!bunxResolutionFailed) {
    try {
      return await executeSkillsCli("bunx", args, timeoutMs, lockLost);
    } catch (error) {
      if (isNpxCommandResolutionFailure(error, "bunx")) {
        bunxResolutionFailed = true;
      } else if (!canRetryThroughNpx(error, readOnly)) {
        throw normalizeCliError(error, "bunx", timeoutMs);
      }
    }
  }

  try {
    return await executeSkillsCli("npx", args, timeoutMs, lockLost);
  } catch (npxError) {
    throw normalizeCliError(npxError, "npx", timeoutMs);
  }
}

/**
 * Retrying through npx is only worth it when bunx failed without saying why.
 * A mutating command may already have changed state, a failure with output has
 * already explained itself, a timeout means bunx works but the command is slow,
 * and a lost lock means we must not be running at all.
 */
function canRetryThroughNpx(error: unknown, readOnly: boolean): boolean {
  return readOnly && !hasDiagnosticOutput(error) && !isTimeoutFailure(error) && !isLostLockFailure(error);
}

async function executeSkillsCli(
  runner: PackageRunner,
  args: string[],
  timeoutMs: number,
  lockLost: AbortSignal,
  executable: string = runner,
): Promise<string> {
  const execOptions = await getExecOptions();
  const env = {
    ...execOptions.env,
    ...getSkillsCliEnvOverrides(),
  };

  const { stdout } = await execFileAsync(executable, getRunnerArgs(runner, args), {
    ...execOptions,
    env,
    timeout: timeoutMs,
    signal: lockLost,
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

/**
 * `execFile` reports a hit timeout only as "Command failed: …" with the child
 * killed by the default signal — no exit code, no explanation.
 */
function isTimeoutFailure(error: unknown): boolean {
  const failure = error as ExecFailure | undefined;
  return failure?.killed === true && failure.signal === "SIGTERM" && failure.code == null;
}

function formatTimeout(timeoutMs: number): string {
  return timeoutMs >= 60_000 ? pluralize(timeoutMs / 60_000, "minute") : pluralize(timeoutMs / 1000, "second");
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/**
 * The lost-lock handler is the only thing that aborts a run, so an aborted run
 * always means exclusive access went away underneath it.
 */
function isLostLockFailure(error: unknown): boolean {
  const failure = error as { code?: unknown; name?: unknown } | undefined;
  return failure?.code === "ABORT_ERR" || failure?.name === "AbortError";
}

function normalizeCliError(error: unknown, npxCommand: string, timeoutMs: number): Error {
  if (isLostLockFailure(error)) {
    return new Error(
      "The skills CLI lost exclusive access while running, so the command was stopped before it could finish. Try again.",
    );
  }

  if (isNpxCommandResolutionFailure(error, npxCommand)) {
    return new NpxResolutionError(
      "Unable to find a working bunx or npx command. Install Bun, or install Node.js/npm. If you need to force a custom npx executable, set it in the extension configuration under 'Custom npx Path'.",
    );
  }

  if (!(error instanceof Error)) {
    return new Error("Failed to execute the skills CLI command.");
  }

  if (isTimeoutFailure(error)) {
    const command = (error as ExecFailure).cmd ?? npxCommand;
    return withCliOutput(
      error,
      `The skills CLI did not finish within ${formatTimeout(timeoutMs)}. Check your network connection and try again. If packages install through a corporate proxy, set a custom package registry as the extension README describes.\nCommand: ${command}`,
    );
  }

  return withCliOutput(error);
}

/**
 * `execFile` folds stderr into the rejection message but drops stdout, which is
 * where this CLI reports its failures. Without it the user only sees the command
 * that failed, never the reason. The detailed error gets its own stack so the
 * reason also reaches the logs Raycast copies from the failure toast.
 */
function withCliOutput(error: Error, message: string = error.message): Error {
  const output = extractCliOutput(error);
  if (!output || message.includes(output)) {
    return message === error.message ? error : new Error(message, { cause: error });
  }

  const truncated = output.length > MAX_CLI_OUTPUT_CHARS ? `…${output.slice(-MAX_CLI_OUTPUT_CHARS)}` : output;
  return new Error(`${message.trim()}\n${truncated}`, { cause: error });
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
