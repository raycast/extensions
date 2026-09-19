import { ProcessInfo } from "../models/interfaces";
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

/** Signal 0 delivers nothing: ESRCH means the process is gone, EPERM means it is alive but not ours. */
export function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Resolves true once the process has exited, false if it is still there after the grace period. */
export async function waitForExit(pid: number) {
  for (let attempt = 0; attempt < EXIT_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, EXIT_POLL_INTERVAL_MS));
    if (!isRunning(pid)) return true;
  }
  return false;
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
    onSurvived?: (pid: number) => void;
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
    if (pid !== undefined && !(await waitForExit(pid))) {
      if (onSurvived !== undefined) onSurvived(pid);
      else onError?.(new ProcessSurvivedError(pid));
      return;
    }

    onKilled?.();
  } catch (e) {
    onError?.(e);
  }
}
