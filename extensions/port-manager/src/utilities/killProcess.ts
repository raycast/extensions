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

export type KillSignal = typeof KillSignal[keyof typeof KillSignal];

export async function kill(pid: number | number[], signal: KillSignal) {
  const pids = pid instanceof Array ? pid : [pid];
  await runCommand("/bin/kill", [`-${signal}`, ...pids.map(String)], { timeout: 2_000 });
}

export async function killall(processname: string | string[], signal: KillSignal) {
  const processNames = processname instanceof Array ? processname : [processname];
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
  }>
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
    onKilled && onKilled();
  } catch (e) {
    onError && onError(e);
  }
}
