import { runCommandAsAdmin } from "./exec";

const KILL_SIGNALS = ["SIGTERM", "SIGINT", "SIGKILL"] as const;
export type KillSignal = (typeof KILL_SIGNALS)[number];

const SIGNAL_NUMBERS: Record<KillSignal, number> = { SIGTERM: 15, SIGINT: 2, SIGKILL: 9 };

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

/** Retries the signal through an authenticated shell, for processes owned by another user. */
export async function sendSignalAsAdmin(pid: number, signal: KillSignal, processName: string): Promise<void> {
  assertTarget(pid, signal);

  await runCommandAsAdmin(
    "/bin/kill",
    [`-${SIGNAL_NUMBERS[signal]}`, String(pid)],
    `Open Ports wants to send ${signal} to ${sanitizePrompt(processName)} (PID ${pid}).`,
  );
}

/** The prompt is rendered by macOS, so a process name only contributes plain text to it. */
function sanitizePrompt(value: string): string {
  const cleaned = value.replace(/[^\p{L}\p{N} ._@+-]/gu, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 60) : "a process";
}
