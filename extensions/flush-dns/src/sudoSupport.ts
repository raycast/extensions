import { execFile as execFileCallback } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";

export interface PrivilegedCommand {
  executable: string;
  args: readonly string[];
}

interface PrivilegeRunnerDependencies {
  exists(path: string): boolean;
  read(path: string): string;
  execute(executable: string, args: readonly string[], timeout?: number): Promise<void>;
}

const TOUCH_ID_PATTERN = /^auth\s+sufficient\s+pam_tid\.so$/m;
const SUDO_LOCAL_PATH = "/etc/pam.d/sudo_local";
const SUDO_PATH = "/etc/pam.d/sudo";
const execFile = promisify(execFileCallback);
const APPLE_SCRIPT = `on run argv
  do shell script item 1 of argv with prompt "Flush DNS requires administrator privileges" with administrator privileges
end run`;

function quoteForShell(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function createPrivilegeRunner(dependencies: PrivilegeRunnerDependencies) {
  return async function runWithPrivileges(commands: readonly PrivilegedCommand[]): Promise<void> {
    const pamPath = dependencies.exists(SUDO_LOCAL_PATH) ? SUDO_LOCAL_PATH : SUDO_PATH;
    let touchIdActive = false;

    try {
      touchIdActive = TOUCH_ID_PATTERN.test(dependencies.read(pamPath));
    } catch {
      // Fall back to the existing administrator password prompt when PAM configuration cannot be read.
    }

    if (!touchIdActive) {
      const commandList = commands
        .map((command) => [command.executable, ...command.args].map(quoteForShell).join(" "))
        .join("; ");

      await dependencies.execute("/usr/bin/osascript", ["-e", APPLE_SCRIPT, "--", commandList], 60_000);
      return;
    }

    for (const command of commands) {
      await dependencies.execute("/usr/bin/sudo", [command.executable, ...command.args]);
    }
  };
}

export const runWithPrivileges = createPrivilegeRunner({
  exists: existsSync,
  read: (path) => readFileSync(path, "utf8"),
  execute: async (executable, args, timeout) => {
    await execFile(executable, [...args], timeout === undefined ? undefined : { timeout });
  },
});
