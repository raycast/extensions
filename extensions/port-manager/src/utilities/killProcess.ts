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
    onError?: (error: unknown) => void;
  }>,
) {
  const { killSignal = KillSignal.TERM, killAll = false, killParent = false, onError, onKilled } = options ?? {};

  const killer = async () => {
    if (killAll) {
      if (process.name === undefined) throw new Error("Can't use killall because process name is undefined");
      await killall(process.name, killSignal);
      return;
    }

    if (killParent) {
      if (process.parentPid === undefined) throw new Error("Can't kill parent because parent pid is undefined");
      await kill(process.parentPid, killSignal);
      return;
    }

    await kill(process.pid, killSignal);
  };

  try {
    await killer();
    onKilled?.();
  } catch (e) {
    onError?.(e);
  }
}
