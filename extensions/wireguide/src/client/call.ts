import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferences } from "./preferences";

const pExecFile = promisify(execFile);

export async function callWireguide(...args: string[]) {
    const { binary } = getPreferences();
    const { stdout } = await pExecFile(binary, ["ctl", ...args]);
    return stdout;
}
