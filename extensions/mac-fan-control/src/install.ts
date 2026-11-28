import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runAppleScript } from "@raycast/utils";

const run = promisify(execFile);

export const CORE_PATH = "/usr/local/bin/fan_control";
export const SUDOERS_PATH = "/etc/sudoers.d/macos-fan-control";

// The prompt waits for the user, so it outlives the helper's default timeout.
const PROMPT_TIMEOUT_MILLISECONDS = 300_000;

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

// Runs as root from one authorisation prompt. The helper arrives as $1, the hash
// of the bundled copy as $2 and the user name as $3, so no value is ever spliced
// into shell text. Existing directories are checked, never re-owned, and the
// staged file is only installed when it still matches the bundled helper.
const INSTALL_SCRIPT = [
  "set -e",
  "if [ ! -d /usr/local ]; then /usr/bin/install -o root -g wheel -m 0755 -d /usr/local; fi",
  "if [ ! -d /usr/local/bin ]; then /usr/bin/install -o root -g wheel -m 0755 -d /usr/local/bin; fi",
  "for directory in /usr/local /usr/local/bin; do",
  '  [ "$(/usr/bin/stat -f %Su "$directory")" = root ] || { echo "$directory is not owned by root, so a passwordless rule there would be unsafe" >&2; exit 3; }',
  '  [ "$(/usr/bin/stat -f %OLp "$directory")" = 755 ] || { echo "$directory is writable by other users, so a passwordless rule there would be unsafe" >&2; exit 4; }',
  "done",
  'actual="$(/usr/bin/shasum -a 256 "$1" | /usr/bin/cut -d " " -f 1)"',
  '[ "$actual" = "$2" ] || { echo "The staged helper does not match the one bundled with the extension, so nothing was installed" >&2; exit 5; }',
  '/usr/bin/install -o root -g wheel -m 0755 "$1" /usr/local/bin/fan_control',
  'rule="$(/usr/bin/mktemp /tmp/macos-fan-control-sudoers.XXXXXX)"',
  `trap '/bin/rm -f "$rule"' EXIT`,
  `printf '%s ALL=(root) NOPASSWD: %s\\n' "$3" /usr/local/bin/fan_control > "$rule"`,
  '/usr/sbin/visudo -cqf "$rule" || { echo "The generated sudoers rule failed validation, so nothing was installed" >&2; exit 6; }',
  '/usr/bin/install -o root -g wheel -m 0440 "$rule" /etc/sudoers.d/macos-fan-control',
  '/usr/sbin/visudo -cqf /etc/sudoers || { echo "The sudoers file no longer validates" >&2; exit 7; }',
  "/usr/local/bin/fan_control status --json >/dev/null",
].join("\n");

const INSTALL_APPLE_SCRIPT = [
  "on run argv",
  "set binary to quoted form of (item 1 of argv)",
  "set hash to quoted form of (item 2 of argv)",
  "set userName to quoted form of (item 3 of argv)",
  `do shell script "/bin/sh -c " & quoted form of "${appleScriptLiteral(INSTALL_SCRIPT)}" & " mac-fan-control " & binary & " " & hash & " " & userName with administrator privileges`,
  "end run",
].join("\n");

export async function installCore(): Promise<void> {
  const userName = userInfo().username;
  if (!/^[A-Za-z0-9._-]+$/.test(userName)) {
    throw new Error(`Unsupported user name: ${userName}`);
  }

  const bundledBinary = join(environment.assetsPath, "fan_control");
  const bundledHash = createHash("sha256")
    .update(await readFile(bundledBinary))
    .digest("hex");

  const stagingDirectory = await mkdtemp(join(tmpdir(), "mac-fan-control-"));
  const stagedBinary = join(stagingDirectory, "fan_control");
  try {
    await copyFile(bundledBinary, stagedBinary);
    await chmod(stagedBinary, 0o755);
    await runAppleScript(
      INSTALL_APPLE_SCRIPT,
      [stagedBinary, bundledHash, userName],
      { timeout: PROMPT_TIMEOUT_MILLISECONDS },
    );
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export function isCancelled(error: unknown): boolean {
  return /User canceled|-128/.test(error instanceof Error ? error.message : "");
}
