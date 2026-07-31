import { runAppleScript } from "@raycast/utils";
import { exec as baseExec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";

const exec = promisify(baseExec);

export class AuthenticationCanceledError extends Error {
  constructor() {
    super("Doorstopper was not changed");
    this.name = "AuthenticationCanceledError";
  }
}

function sudoSupportsTouchId(): boolean {
  const pattern = /^[ \t]*auth[ \t]+sufficient[ \t]+pam_tid\.so[ \t]*(?:#.*)?$/m;
  const targetFiles = ["/etc/pam.d/sudo_local", "/etc/pam.d/sudo"];

  return targetFiles.some((targetFile) => existsSync(targetFile) && pattern.test(readFileSync(targetFile, "utf8")));
}

export async function runWithPrivileges(command: string): Promise<void> {
  if (sudoSupportsTouchId()) {
    try {
      await exec(`/usr/bin/sudo ${command}`);
    } catch (error) {
      const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";

      if (stderr.includes("a terminal is required")) {
        throw new AuthenticationCanceledError();
      }

      throw error;
    }
  } else {
    await runAppleScript(
      `on run argv
        do shell script item 1 of argv with prompt "Doorstopper requires admin privileges" with administrator privileges
      end`,
      [command],
      { timeout: 60000 },
    );
  }
}
