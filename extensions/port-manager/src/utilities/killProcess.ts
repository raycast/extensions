import { promisify } from "util";
import { exec as cExec } from "child_process";
import { getPreferenceValues } from "@raycast/api";

const exec = promisify(cExec);

export enum KillSignal {
  /**
   * Hang Up
   */
  HUP = 1,

  /**
   * Interrupt
   */
  INT = 2,

  /**
   * Quit
   */
  QUIT = 3,

  /**
   * Abort
   */
  ABRT = 6,

  /**
   * Non-catchable, non-ignorable kill
   */
  KILL = 9,

  /**
   * Alarm clock
   */
  ALRM = 14,

  /**
   * Software termination signal
   */
  TERM = 15,
}

export async function kill(
  pid: number | number[],
  signal = KillSignal.TERM,
  useSudo: boolean = getPreferenceValues().sudo ?? false
) {
  const pidString = pid instanceof Array ? pid.join(" ") : pid;
  const cmd = `${useSudo ? "/usr/bin/sudo /bin/kill" : "kill"} -${signal} ${pidString}`;
  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
}

export async function killall(
  processname: string | string[],
  signal = KillSignal.TERM,
  useSudo: boolean = getPreferenceValues().sudo ?? false
) {
  const processnameString =
    processname instanceof Array ? processname.map((n) => `'${n}'`).join(" ") : `'${processname}'`;
  const cmd = `${useSudo ? "/usr/bin/sudo " : ""}/usr/bin/killall -${signal} ${processnameString}`;
  const { stderr } = await exec(cmd);
  if (stderr) throw new Error(stderr);
}
