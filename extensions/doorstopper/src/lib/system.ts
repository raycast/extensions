/// <reference types="node" />
import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { Battery, parseBattery, parseBootTime, parseSleepDisabled } from "./parse";
import { runWithPrivileges } from "../sudoSupport";

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
const MKTEMP = "/usr/bin/mktemp";

// Each macOS account gets its own rule file, so one account's setup never replaces another account's rule.
// sudo skips file names that contain a dot, so dots in the username are written as underscores.
export function sudoersPathFor(username: string): string {
  sudoersRule(username);
  return `/etc/sudoers.d/raycast-doorstopper-${username.replace(/\./g, "_")}`;
}

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
    // Rule not installed: ask for Touch ID or the admin password, as Doorstopper always has.
    await runWithPrivileges(`${PMSET} -a disablesleep ${value}`);
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

export function sudoersRule(username: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    throw new Error(`Unsupported macOS username "${username}" for a sudoers rule`);
  }
  // The username check above guarantees the rule contains no quotes.
  return `${username} ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1`;
}

// The root shell command that installs the rule for `username`. It is run through runAsAdmin, or as root by sudo in tests.
export function installRuleScript(username: string): string {
  const rule = sudoersRule(username);
  const path = sudoersPathFor(username);
  const install = [
    `${PRINTF} '%s\\n' '${rule}' > "$T"`,
    `${VISUDO} -cf "$T"`,
    `${CHOWN} root:wheel "$T"`,
    `${CHMOD} 0440 "$T"`,
    `${MV} -f "$T" ${path}`,
  ].join(" && ");
  // Everything runs as root inside the root-owned sudoers.d directory, so the user cannot swap the file.
  // mktemp gives each attempt its own 0600 file, so overlapping installs never share one. The dotted name
  // is ignored by sudo, so this staging file is never read as a rule.
  return `T=$(${MKTEMP} /etc/sudoers.d/.raycast-doorstopper.XXXXXX) || exit 1; ${install}; S=$?; ${RM} -f "$T"; exit $S`;
}

export function removeRuleScript(username: string): string {
  return `${RM} -f ${sudoersPathFor(username)}`;
}

export async function installRule(): Promise<void> {
  await runAsAdmin(installRuleScript(os.userInfo().username));
}

export async function removeRule(): Promise<void> {
  await runAsAdmin(removeRuleScript(os.userInfo().username));
}
