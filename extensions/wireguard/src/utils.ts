import { closeMainWindow, PopToRootType } from "@raycast/api";
import { exec } from "child_process";
import { VPN } from "./type";
import util from "util";

export const CMD_PATH = "/usr/sbin/scutil";

/**
 * Execute CLI command
 * @param command CLI command to execute
 * @param isSilently whether to close the raycast main window, default is `false`
 * @returns `string`, CLI command result
 * @throws Error if command
 */
export async function runScript(command: string, isSilently = false): Promise<string> {
  const execAsync = util.promisify(exec);
  const { stdout, stderr } = await execAsync(command);
  if (stderr) {
    console.error(stderr);
    throw new Error(stderr);
  }
  // replace only the line break character
  const ret = await stdout.replace(/\r?\n$/, "");
  if (isSilently === true) {
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  }
  return ret;
}

/*
export async function showNotification(message: string) {
    try {
        //const result = await runScript(script);
        await showHUD(message);
      } catch (err) {
        console.error(err);
      }
  }
  */

export function sortVPNArray(VPNArray: VPN[] = []) {
  VPNArray?.sort((foo, bar) => {
    const fooVal = foo.isConnected ? 1 : 0;
    const barVal = bar.isConnected ? 1 : 0;
    if (fooVal == barVal) {
      return foo.name.localeCompare(bar.name);
    } else {
      return barVal - fooVal;
    }
  });
}

export async function runScriptReturnArray(command: string, isSilently = false) {
  const retString = await runScript(command, isSilently);
  if (retString !== "") {
    return retString.split(/\r?\n/);
  } else {
    return [];
  }
}
