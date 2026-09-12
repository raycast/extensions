import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { reportError } from "../utils/reportError";

const execFileAsync = promisify(execFile);

/**
 * Returns one entry per running process, or `null` when `ps` could not be read.
 *
 * `null` and `[]` must stay distinct: an empty process list means nothing is
 * running, while an unreadable one means nothing is known. Callers that delete
 * profile directories treat the two oppositely, so collapsing them would let a
 * transient `ps` failure erase a profile that Chromium still has open.
 */
export async function getChromiumProcessArgs(): Promise<string[] | null> {
  try {
    const { stdout } = await execFileAsync("ps", ["-wwAo", "args="]);
    return stdout.split("\n").filter((line) => line.trim().length > 0);
  } catch (error) {
    await reportError("Could not list running processes", error, { silent: true });
    return null;
  }
}

export function isProfileInUse(profilePath: string, psLines: string[]): boolean {
  const needle = `--user-data-dir=${profilePath}`;
  return psLines.some((line) => line.includes(needle));
}

export async function isChromiumBinaryRunning(binaryPath: string): Promise<boolean> {
  const target = path.resolve(binaryPath);
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "args="]);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .some((line) => line === target || line.startsWith(`${target} `));
  } catch (error) {
    await reportError("Could not check running Chromium processes", error, { silent: true });
    return false;
  }
}
