import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, chmod, copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const CORE_PATH = "/usr/local/bin/fan_control";
export const SUDOERS_PATH = "/etc/sudoers.d/macos-fan-control";
const INSTALL = "/usr/bin/install";
const STAT = "/usr/bin/stat";
const VISUDO = "/usr/sbin/visudo";
const OSASCRIPT = "/usr/bin/osascript";

export interface InstallState {
  installed: boolean;
  passwordless: boolean;
}

async function allows(command: string, args: string[]): Promise<boolean> {
  try {
    await run(command, args);
    return true;
  } catch {
    return false;
  }
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readInstallState(): Promise<InstallState> {
  const installed = await isExecutable(CORE_PATH);
  const passwordless =
    installed && (await allows("/usr/bin/sudo", ["-n", "-l", CORE_PATH]));
  return { installed, passwordless };
}

// The client reports these two messages when the helper is missing or the rule
// is gone; both are fixed by the setup command.
export function needsSetup(error: Error): boolean {
  return /is not installed|NOPASSWD rule is missing/.test(error.message);
}

function appleScriptLiteral(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// `install` and `visudo` run as root from one authorisation prompt. The binary is
// copied to a root-only directory before the sudoers rule is written, and the
// rule is validated with `visudo -c` so a bad rule never reaches /etc/sudoers.d.
function installScript(stagedBinary: string, userName: string): string {
  return [
    "set -e",
    `${INSTALL} -o root -g wheel -m 0755 -d /usr/local/bin`,
    `${INSTALL} -o root -g wheel -m 0755 "${stagedBinary}" ${CORE_PATH}`,
    `[ "$(${STAT} -f '%Su' /usr/local/bin)" = root ] || { echo "/usr/local/bin is not owned by root, so the passwordless rule would be unsafe" >&2; exit 3; }`,
    `[ "$(${STAT} -f '%OLp' /usr/local/bin)" = 755 ] || { echo "/usr/local/bin is writable by other users, so the passwordless rule would be unsafe" >&2; exit 4; }`,
    `rule="$(/usr/bin/mktemp /tmp/macos-fan-control-sudoers.XXXXXX)"`,
    `trap '/bin/rm -f "$rule"' EXIT`,
    `printf '%s ALL=(root) NOPASSWD: %s\\n' "${userName}" ${CORE_PATH} > "$rule"`,
    `${VISUDO} -cqf "$rule" || { echo "The generated sudoers rule failed validation, so nothing was installed" >&2; exit 5; }`,
    `${INSTALL} -o root -g wheel -m 0440 "$rule" ${SUDOERS_PATH}`,
    `${VISUDO} -cqf /etc/sudoers || { echo "The sudoers file no longer validates" >&2; exit 6; }`,
    `${CORE_PATH} status --json >/dev/null`,
  ].join("\n");
}

export async function installCore(): Promise<void> {
  const userName = userInfo().username;
  if (!/^[A-Za-z0-9._-]+$/.test(userName)) {
    throw new Error(`Unsupported user name: ${userName}`);
  }

  const stagingDirectory = await mkdtemp(join(tmpdir(), "mac-fan-control-"));
  const stagedBinary = join(stagingDirectory, "fan_control");
  try {
    await copyFile(join(environment.assetsPath, "fan_control"), stagedBinary);
    await chmod(stagedBinary, 0o755);
    const script = installScript(stagedBinary, userName);
    await run(OSASCRIPT, [
      "-e",
      `do shell script "${appleScriptLiteral(script)}" with administrator privileges`,
    ]);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export function isCancelled(error: unknown): boolean {
  return /User canceled|-128/.test(error instanceof Error ? error.message : "");
}
