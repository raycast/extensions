import { runAppleScript } from "@raycast/utils";
import { exec as baseExec } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";

const exec = promisify(baseExec);

/**
 * Test whether we should use `sudo` since it supports touch ID
 */
function sudoSupportsTouchId(): boolean {
  const pattern = /^auth\s+sufficient\s+pam_tid\.so$/m;
  const targetFile = existsSync("/etc/pam.d/sudo_local") ? "/etc/pam.d/sudo_local" : "/etc/pam.d/sudo";

  return pattern.test(readFileSync(targetFile).toString());
}

/**
 * Run `command` with escalated privileges
 */
export async function runWithPrivileges(command: string): Promise<void> {
  if (sudoSupportsTouchId()) {
    await exec(`sudo ${command}`);
  } else {
    await runAppleScript(
      `on run argv
        do shell script item 1 of argv with administrator privileges
      end`,
      [command],
      { timeout: 60000 },
    );
  }
}
