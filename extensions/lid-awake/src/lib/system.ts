/// <reference types="node" />
import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { Battery, parseBattery, parseBootTime, parseSleepDisabled } from "./parse";

const execFileAsync = promisify(execFile);

// Raycast runs with a minimal PATH, so every binary is referenced by absolute path.
const PMSET = "/usr/bin/pmset";
const SUDO = "/usr/bin/sudo";
const OSASCRIPT = "/usr/bin/osascript";
const SYSCTL = "/usr/sbin/sysctl";
const VISUDO = "/usr/sbin/visudo";
const PRINTF = "/usr/bin/printf";
const CHOWN = "/usr/sbin/chown";
const CHMOD = "/bin/chmod";
const MV = "/bin/mv";
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

export async function setSleepDisabled(on: boolean, options: { allowPrompt?: boolean } = {}): Promise<void> {
  const value = on ? "1" : "0";
  try {
    // Works without a prompt once the sudoers rule is installed.
    await execFileAsync(SUDO, ["-n", PMSET, "-a", "disablesleep", value]);
  } catch (error) {
    if (!options.allowPrompt) {
      throw error;
    }
    // Rule not installed yet: fall back to an admin password prompt.
    await runAsAdmin(`${PMSET} -a disablesleep ${value}`);
  }
}

export async function isRuleInstalled(): Promise<boolean> {
  try {
    // -k ignores cached credentials, so this only passes when the NOPASSWD rule applies.
    await execFileAsync(SUDO, ["-k", "-n", "-l", PMSET, "-a", "disablesleep", "1"]);
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

  // The username check above guarantees the rule contains no quotes.
  const rule = `${username} ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1`;
  // A name with a dot is ignored by sudo, so this staging file is never read as a rule.
  const tempFile = `${SUDOERS_PATH}.tmp`;
  const install = [
    `${PRINTF} '%s\\n' '${rule}' > "$T"`,
    `${VISUDO} -cf "$T"`,
    `${CHOWN} root:wheel "$T"`,
    `${CHMOD} 0440 "$T"`,
    `${MV} -f "$T" ${SUDOERS_PATH}`,
  ].join(" && ");
  // Everything runs as root inside the root-owned sudoers.d directory, so the user cannot swap the file.
  await runAsAdmin(`umask 077; T=${tempFile}; ${RM} -f "$T"; ${install}; S=$?; ${RM} -f "$T"; exit $S`);
}

export async function removeRule(): Promise<void> {
  await runAsAdmin(`${RM} -f ${SUDOERS_PATH}`);
}
