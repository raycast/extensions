import { exec as cExec } from "child_process";
import { promisify } from "util";
import { ProcessInfo } from "../models/interfaces";

const exec = promisify(cExec);

export const KillSignal = {
  /** Hang Up */
  HUP: "1",

  /** Interrupt */
  INT: "2",

  /** Quit */
  QUIT: "3",

  /** Abort */
  ABRT: "6",

  /** Non-catchable, non-ignorable kill */
  KILL: "9",

  /** Alarm clock */
  ALRM: "14",

  /** Software termination signal */
  TERM: "15",
};

export type KillSignal = typeof KillSignal[keyof typeof KillSignal];

export async function kill(pid: number | number[], signal: KillSignal) {
  const pidString = pid instanceof Array ? pid.join(" ") : pid;
  const cmd = `kill -${signal} ${pidString}`;

  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
}

export async function killall(processname: string | string[], signal: KillSignal) {
  const processnameString =
    processname instanceof Array ? processname.map((n) => `'${n}'`).join(" ") : `'${processname}'`;
  const cmd = `/usr/bin/killall -${signal} ${processnameString}`;
  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
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
