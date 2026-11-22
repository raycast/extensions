// Process-group signalling shared by the foreground runner and background Stop. Each caller
// keeps its own ownership check; this only sends the signal and reads the kernel's answer.

/** "gone": nothing is left (ESRCH). "denied": it exists but isn't ours (EPERM). */
export type GroupSignal = "sent" | "gone" | "denied";

/** signalGroup's shape for a real signal; the runner and Stop take one as a test seam. */
export type GroupSignaller = (pgid: number, sig: NodeJS.Signals) => GroupSignal;

export function signalGroup(pgid: number, sig: NodeJS.Signals | 0): GroupSignal {
  return signal(pgid, -pgid, sig);
}

/** The same answer for one process (a run's wrapper). */
export function signalPid(pid: number, sig: NodeJS.Signals | 0): GroupSignal {
  return signal(pid, pid, sig);
}

function signal(id: number, target: number, sig: NodeJS.Signals | 0): GroupSignal {
  // kill(-1) reaches every process we may signal, kill(0) our own group, and pid 1 is launchd:
  // none is ever a run's (ids come from records on disk too).
  if (!Number.isInteger(id) || id <= 1) throw new Error(`not a process or group id: ${id}`);
  try {
    process.kill(target, sig);
    return "sent";
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "gone";
    if (code === "EPERM") return "denied";
    throw e;
  }
}

/** True while any process in the group exists, ours or not. */
export const groupAlive = (pgid: number) => signalGroup(pgid, 0) !== "gone";
