import { isWindows } from "./platform";
import { killProcessesUnix, killProcessUnix, ProcessKillerError } from "./killers/unix";
import { killProcessesWindows, killProcessWindows } from "./killers/win32";

export { ProcessKillerError };

export async function killProcess(pid: number): Promise<void> {
  if (isWindows) {
    return killProcessWindows(pid);
  }
  return killProcessUnix(pid);
}

export async function killProcesses(pids: Iterable<number>): Promise<void> {
  if (isWindows) {
    return killProcessesWindows(pids);
  }
  return killProcessesUnix(pids);
}
