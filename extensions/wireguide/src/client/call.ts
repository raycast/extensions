import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getPreferences } from "./preferences";

const pExec = promisify(exec);

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export async function callWireguide(...args: string[]) {
    const { binary } = getPreferences();
    const cmd = [binary, "ctl", ...args].map(shellQuote).join(" ");
    const { stdout } = await pExec(cmd);
    return stdout;
}
