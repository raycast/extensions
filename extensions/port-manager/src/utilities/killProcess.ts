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

export async function kill(pid: number | number[], signal: KillSignal, useSudo: boolean) {
  const pidString = pid instanceof Array ? pid.join(" ") : pid;
  const cmd = `${useSudo ? "/usr/bin/sudo /bin/kill" : "kill"} -${signal} ${pidString}`;

  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
}

export async function killall(processname: string | string[], signal: KillSignal, useSudo: boolean) {
  const processnameString =
    processname instanceof Array ? processname.map((n) => `'${n}'`).join(" ") : `'${processname}'`;
  const cmd = `${useSudo ? "/usr/bin/sudo " : ""}/usr/bin/killall -${signal} ${processnameString}`;
  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
}

export async function killProcess(
  process: ProcessInfo,
  options?: Partial<{
    killSignal?: KillSignal;
    useSudo?: boolean;
    killAll?: boolean;
    killParent?: boolean;
    onKilled?: () => void;
    onError?: (error: unknown) => void;
  }>
) {
  const {
    killSignal = KillSignal.TERM,
    useSudo = false,
    killAll = false,
    killParent = false,
    onError,
    onKilled,
  } = options ?? {};

  const killer = async () => {
    if (killAll) {
      if (process.name === undefined) throw new Error("Can't use killall because process name is undefined");
      await killall(process.name, killSignal, useSudo);
      return;
    }

    if (killParent) {
      if (process.parentPid === undefined) throw new Error("Can't kill parent because parent pid is undefined");
      await kill(process.parentPid, killSignal, useSudo);
      return;
    }

    await kill(process.pid, killSignal, useSudo);
  };

  try {
    await killer();
    onKilled && onKilled();
  } catch (e) {
    console.log(e);
    onError && onError(e);
  }
}
