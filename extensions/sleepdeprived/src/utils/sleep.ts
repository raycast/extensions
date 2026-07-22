import { launchCommand, LaunchType } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PMSET_PATH = "/usr/bin/pmset";
const OSASCRIPT_PATH = "/usr/bin/osascript";

export async function isSleepDisabled(): Promise<boolean> {
  const { stdout } = await execFileAsync(PMSET_PATH, ["-g"]);
  const match = stdout.match(/^\s*SleepDisabled\s+([01])\s*$/m);

  if (!match) {
    throw new Error("SleepDisabled status not found");
  }

  return match[1] === "1";
}

export async function setSleepDisabled(disabled: boolean): Promise<void> {
  const value = disabled ? "1" : "0";
  const command = `${PMSET_PATH} -a disablesleep ${value}`;

  await execFileAsync(OSASCRIPT_PATH, ["-e", `do shell script "${command}" with administrator privileges`]);
}

export async function refreshSleepStatusCommand(): Promise<void> {
  await launchCommand({ name: "check-sleep-status", type: LaunchType.Background });
}

export async function refreshMenuBarCommand(): Promise<void> {
  await launchCommand({ name: "menu-bar", type: LaunchType.Background });
}
