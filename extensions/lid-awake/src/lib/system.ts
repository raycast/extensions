/// <reference types="node" />
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Battery, parseBattery, parseBootTime, parseSleepDisabled } from "./parse";

const execFileAsync = promisify(execFile);

// Raycast runs with a minimal PATH, so every binary is referenced by absolute path.
const PMSET = "/usr/bin/pmset";
const SUDO = "/usr/bin/sudo";
const OSASCRIPT = "/usr/bin/osascript";
const SYSCTL = "/usr/sbin/sysctl";
const VISUDO = "/usr/sbin/visudo";
const INSTALL = "/usr/bin/install";
const RM = "/bin/rm";

export const SUDOERS_PATH = "/etc/sudoers.d/raycast-lid-awake";

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function runAsAdmin(shellCommand: string): Promise<void> {
  await execFileAsync(OSASCRIPT, [
    "-e",
    `do shell script ${appleScriptString(shellCommand)} with administrator privileges`,
  ]);
}

export async function isSleepDisabled(): Promise<boolean> {
  const { stdout } = await execFileAsync(PMSET, ["-g"]);
  return parseSleepDisabled(stdout);
}

export async function getBattery(): Promise<Battery> {
  const { stdout } = await execFileAsync(PMSET, ["-g", "batt"]);
  return parseBattery(stdout);
}

export async function getBootTime(): Promise<number | null> {
  const { stdout } = await execFileAsync(SYSCTL, ["-n", "kern.boottime"]);
  return parseBootTime(stdout);
}

export async function setSleepDisabled(on: boolean): Promise<void> {
  const value = on ? "1" : "0";
  try {
    // Works without a prompt once the sudoers rule is installed.
    await execFileAsync(SUDO, ["-n", PMSET, "-a", "disablesleep", value]);
  } catch {
    // Rule not installed yet: fall back to an admin password prompt.
    await runAsAdmin(`${PMSET} -a disablesleep ${value}`);
  }
}

export async function isRuleInstalled(): Promise<boolean> {
  try {
    await execFileAsync(SUDO, ["-n", "-l", PMSET, "-a", "disablesleep", "1"]);
    return true;
  } catch {
    return false;
  }
}

export async function installRule(): Promise<void> {
  const username = os.userInfo().username;
  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    throw new Error(`Unsupported macOS username "${username}" for a sudoers rule`);
  }

  const rule = `${username} ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1\n`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "lid-awake-"));
  try {
    const tempFile = path.join(tempDir, "raycast-lid-awake");
    await writeFile(tempFile, rule, { mode: 0o644 });
    await runAsAdmin(
      `${VISUDO} -cf '${tempFile}' && ${INSTALL} -m 0440 -o root -g wheel '${tempFile}' ${SUDOERS_PATH}`,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function removeRule(): Promise<void> {
  await runAsAdmin(`${RM} -f ${SUDOERS_PATH}`);
}
