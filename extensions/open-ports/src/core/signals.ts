import { CommandError, runCommandAsAdmin, runShellAsAdmin, shellQuote } from "./exec";

const KILL_SIGNALS = ["SIGTERM", "SIGINT", "SIGKILL"] as const;
export type KillSignal = (typeof KILL_SIGNALS)[number];

const SIGNAL_NUMBERS: Record<KillSignal, number> = { SIGTERM: 15, SIGINT: 2, SIGKILL: 9 };

/** Exit status the guarded script uses when the PID no longer holds the expected process. */
const IDENTITY_MISMATCH_EXIT = 87;

/**
 * `kill(2)` gives 0 and negative values a completely different meaning: PID 0 signals the
 * caller's entire process group and -1 signals every process the user may signal. Neither
 * is ever what this extension wants, so every PID crosses this gate before it is used.
 */
export function isValidPid(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function isKillSignal(value: unknown): value is KillSignal {
  return typeof value === "string" && (KILL_SIGNALS as readonly string[]).includes(value);
}

export class InvalidTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTargetError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(readonly pid: number) {
    super(`Not permitted to signal PID ${pid}`);
    this.name = "PermissionDeniedError";
  }
}

export class ProcessIdentityChangedError extends Error {
  constructor(readonly pid: number) {
    super(`PID ${pid} no longer belongs to the process that was selected`);
    this.name = "ProcessIdentityChangedError";
  }
}

export class NoSuchProcessError extends Error {
  constructor(readonly pid: number) {
    super(`No process with PID ${pid}`);
    this.name = "NoSuchProcessError";
  }
}

function assertTarget(pid: number, signal: KillSignal): void {
  if (!isValidPid(pid)) {
    throw new InvalidTargetError(`${pid} is not a valid process ID`);
  }
  if (!isKillSignal(signal)) {
    throw new InvalidTargetError(`${signal} is not a signal this extension sends`);
  }
}

export function processExists(pid: number): boolean {
  if (!isValidPid(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process is alive but owned by somebody else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function sendSignal(pid: number, signal: KillSignal): Promise<void> {
  assertTarget(pid, signal);

  try {
    process.kill(pid, signal);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM") throw new PermissionDeniedError(pid);
    if (code === "ESRCH") throw new NoSuchProcessError(pid);
    throw error;
  }
}

/**
 * Retries the signal through an authenticated shell, for processes owned by another user.
 *
 * The authentication dialog stays on screen for as long as the user takes to reach for a
 * password, and a PID released during that window can be handed straight to an unrelated
 * process. Checking the start time before the dialog would therefore prove nothing by the
 * time the signal lands, so the check travels into the privileged command itself and runs
 * immediately before the kill.
 */
export async function sendSignalAsAdmin(
  pid: number,
  signal: KillSignal,
  processName: string,
  startedAt?: string,
): Promise<void> {
  assertTarget(pid, signal);

  const prompt = `Open Ports wants to send ${signal} to ${sanitizePrompt(processName)} (PID ${pid}).`;

  if (startedAt === undefined) {
    await runCommandAsAdmin("/bin/kill", [`-${SIGNAL_NUMBERS[signal]}`, String(pid)], prompt);
    return;
  }

  try {
    await runShellAsAdmin(buildGuardedKill(pid, SIGNAL_NUMBERS[signal], startedAt), prompt);
  } catch (error) {
    if (error instanceof CommandError && error.message.includes(`(${IDENTITY_MISMATCH_EXIT})`)) {
      throw new ProcessIdentityChangedError(pid);
    }
    throw error;
  }
}

/**
 * Re-reads the start time as root and kills only on a match. `awk '{$1=$1;print}'` collapses
 * runs of whitespace and trims, matching how the expected value was normalised when it was
 * captured. The PID and signal are integers validated by `assertTarget`, and the expected
 * start time is shell-quoted, so nothing here can extend the command.
 */
export function buildGuardedKill(pid: number, signalNumber: number, startedAt: string): string {
  return (
    `started=$(/bin/ps -o lstart= -p ${pid} | /usr/bin/awk '{$1=$1;print}'); ` +
    `[ "$started" = ${shellQuote(startedAt)} ] || exit ${IDENTITY_MISMATCH_EXIT}; ` +
    `/bin/kill -${signalNumber} ${pid}`
  );
}

/** The prompt is rendered by macOS, so a process name only contributes plain text to it. */
function sanitizePrompt(value: string): string {
  const cleaned = value.replace(/[^\p{L}\p{N} ._@+-]/gu, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 60) : "a process";
}
