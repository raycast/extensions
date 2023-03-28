import { closeMainWindow, PopToRootType } from "@raycast/api";
import { exec } from "child_process";
import { VPN } from "./type";
import util from "util";

export const SHELL_PATH = "/usr/sbin/";
export const CMD_PATH = "/usr/sbin/scutil";

export async function runScript(command: string): Promise<string> {
  const execAsync = util.promisify(exec);
  const { stdout, stderr } = await execAsync(command);
  if (stderr) {
    console.error(stderr);
    throw new Error(stderr);
  }
  // replace only the line break character
  const ret = await stdout.replace(/\r?\n$/, "");
  return ret;
}

export async function runScriptSilently(script: string) {
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  await runScript(script);
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

export function sortVPNList(VPNArray: VPN[] = []) {
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
