import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { TerminalDetection } from "./types";
import { execFileAsync } from "./exec";

export async function findCli(command: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("which", [command]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function findAppBundle(appBundleName: string): string | undefined {
  const candidates = [
    join("/Applications", appBundleName),
    join(homedir(), "Applications", appBundleName),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function detectCliOrApp(
  command: string,
  appBundleName: string,
): Promise<TerminalDetection> {
  const cliPath = await findCli(command);
  const appPath = findAppBundle(appBundleName);
  return {
    installed: Boolean(cliPath || appPath),
    cliPath,
    appPath,
  };
}

export async function isProcessRunning(processName: string): Promise<boolean> {
  try {
    await execFileAsync("pgrep", ["-x", processName]);
    return true;
  } catch {
    return false;
  }
}
