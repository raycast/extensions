import { ProcessInfo } from "../models/interfaces";
import { isWindows } from "./platform";
import { runCommand } from "./runCommand";

export const KillSignal = {
  HUP: "1",
  INT: "2",
  QUIT: "3",
  ABRT: "6",
  KILL: "9",
  ALRM: "14",
  TERM: "15",
};

export type KillSignal = (typeof KillSignal)[keyof typeof KillSignal];

/** How long a signalled process is given to exit before it is reported as still running. */
const EXIT_POLL_ATTEMPTS = 8;
const EXIT_POLL_INTERVAL_MS = 125;

export class ProcessSurvivedError extends Error {
  constructor(public readonly pid: number) {
    super(`Process ${pid} is still running`);
    this.name = "ProcessSurvivedError";
  }
}

export class ProcessGoneError extends Error {
  constructor(public readonly pid: number) {
    super(`Process ${pid} has already exited`);
    this.name = "ProcessGoneError";
  }
}

export class ProcessReplacedError extends Error {
  constructor(public readonly pid: number) {
    super(`PID ${pid} now belongs to a different process, nothing was killed`);
    this.name = "ProcessReplacedError";
  }
}

/** A process that outlived a signal, with enough identity to recognise it again later. */
export interface Survivor {
  pid: number;
  startedAt?: string;
}

/** Signal 0 delivers nothing: ESRCH means the process is gone, EPERM means it is alive but not ours. */
export function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Polls every PID against one shared deadline and returns the ones that are still running. */
export async function waitForExit(pids: number | number[]) {
  let remaining = (Array.isArray(pids) ? pids : [pids]).filter(isRunning);

  for (let attempt = 0; attempt < EXIT_POLL_ATTEMPTS && remaining.length > 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, EXIT_POLL_INTERVAL_MS));
    remaining = remaining.filter(isRunning);
  }

  return remaining;
}

/**
 * The process start time, which together with the PID survives PID reuse. A toast can sit on
 * screen indefinitely, and the PID it captured may belong to something else by the time the
 * action is pressed.
 */
export async function processFingerprint(pid: number) {
  if (isWindows) return undefined;

  try {
    const { stdout } = await runCommand("/bin/ps", ["-o", "lstart=", "-p", String(pid)], { timeout: 2_000 });
    const startedAt = stdout.trim().replace(/\s+/g, " ");
    return startedAt.length > 0 ? startedAt : undefined;
  } catch {
    return undefined;
  }
}

async function toSurvivor(pid: number): Promise<Survivor> {
  return { pid, startedAt: await processFingerprint(pid) };
}

/** Sends the signal only if the PID still belongs to the process the survivor was captured from. */
export async function killSurvivor(survivor: Survivor, signal: KillSignal) {
  if (!isRunning(survivor.pid)) throw new ProcessGoneError(survivor.pid);
  if (survivor.startedAt !== undefined && (await processFingerprint(survivor.pid)) !== survivor.startedAt) {
    throw new ProcessReplacedError(survivor.pid);
  }
  await kill(survivor.pid, signal);
}

/** The follow-up to a survived kill: SIGKILL with an identity check, then one more exit check. */
export async function forceKill(
  survivor: Survivor,
  callbacks: { onKilled?: () => void; onError?: (error: unknown) => void },
) {
  try {
    await killSurvivor(survivor, KillSignal.KILL);
    if ((await waitForExit(survivor.pid)).length > 0) throw new ProcessSurvivedError(survivor.pid);
    callbacks.onKilled?.();
  } catch (error) {
    callbacks.onError?.(error);
  }
}

export function resolveKillSignal(preference: string): KillSignal {
  if (preference === KillSignal.KILL || preference === KillSignal.TERM) {
    return preference;
  }
  return KillSignal.TERM;
}

export async function kill(pid: number | number[], signal: KillSignal) {
  const pids = pid instanceof Array ? pid : [pid];
  if (process.platform === "win32") {
    await Promise.all(
      pids.map((processId) => runCommand("taskkill.exe", ["/PID", String(processId), "/F"], { timeout: 2_000 })),
    );
    return;
  }

  await runCommand("/bin/kill", [`-${signal}`, ...pids.map(String)], { timeout: 2_000 });
}

export async function killall(processname: string | string[], signal: KillSignal) {
  const processNames = processname instanceof Array ? processname : [processname];
  if (process.platform === "win32") {
    await Promise.all(processNames.map((name) => runCommand("taskkill.exe", ["/IM", name, "/F"], { timeout: 5_000 })));
    return;
  }

  await runCommand("/usr/bin/killall", [`-${signal}`, ...processNames], { timeout: 5_000 });
}

export async function killProcess(
  process: ProcessInfo,
  options?: Partial<{
    killSignal?: KillSignal;
    killAll?: boolean;
    killParent?: boolean;
    onKilled?: () => void;
    /** The signal was delivered but the process did not exit. Falls back to `onError` when absent. */
    onSurvived?: (survivor: Survivor) => void;
    onError?: (error: unknown) => void;
  }>,
) {
  const {
    killSignal = KillSignal.TERM,
    killAll = false,
    killParent = false,
    onError,
    onKilled,
    onSurvived,
  } = options ?? {};

  // Returns the PID that was signalled, or undefined when the target was a name rather than a PID.
  const killer = async () => {
    if (killAll) {
      if (process.name === undefined) throw new Error("Can't use killall because process name is undefined");
      await killall(process.name, killSignal);
      return undefined;
    }

    if (killParent) {
      if (process.parentPid === undefined) throw new Error("Can't kill parent because parent pid is undefined");
      await kill(process.parentPid, killSignal);
      return process.parentPid;
    }

    await kill(process.pid, killSignal);
    return process.pid;
  };

  try {
    const pid = await killer();

    // `kill` exiting 0 only means the signal was delivered. A process that ignores SIGTERM is
    // still listening, so wait briefly for it to actually go before reporting success.
    if (pid !== undefined && (await waitForExit(pid)).length > 0) {
      if (onSurvived !== undefined) onSurvived(await toSurvivor(pid));
      else onError?.(new ProcessSurvivedError(pid));
      return;
    }

    onKilled?.();
  } catch (e) {
    onError?.(e);
  }
}
