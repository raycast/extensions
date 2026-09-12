import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { reportError } from "../utils/reportError";

const execFileAsync = promisify(execFile);

export async function getChromiumProcessArgs(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("ps", ["-wwAo", "args="]);
    return stdout.split("\n").filter((line) => line.trim().length > 0);
  } catch (error) {
    await reportError("Could not list running processes", error, { silent: true });
    return [];
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
