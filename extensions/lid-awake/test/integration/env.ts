import { execFileSync } from "node:child_process";

// These tests change the real sleep setting and sudoers file, so they only run on macOS and only when asked for.
export const runIntegration = process.platform === "darwin" && process.env.LID_AWAKE_INTEGRATION === "1";

const SUDO = "/usr/bin/sudo";
const PMSET = "/usr/bin/pmset";

// Runs a command with /bin/sh and returns its stdout. Throws on a non-zero exit.
export function sh(cmd: string): string {
  return execFileSync("/bin/sh", ["-c", cmd], { encoding: "utf8" });
}

// Runs a command as root through sudo, without a password prompt.
export function sudoSh(cmd: string): string {
  return execFileSync(SUDO, ["-n", "/bin/sh", "-c", cmd], { encoding: "utf8" });
}

export function succeeds(file: string, args: string[]): boolean {
  try {
    execFileSync(file, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Reads pmset directly rather than through parse.ts, so a bug in the parser cannot hide a bug in the app.
export function rawSleepDisabled(): boolean {
  return /SleepDisabled\s+1/.test(execFileSync(PMSET, ["-g"], { encoding: "utf8" }));
}

export function assertPasswordlessSudo(): void {
  if (!succeeds(SUDO, ["-n", "/usr/bin/true"])) {
    throw new Error("integration tests need passwordless sudo, run them in CI");
  }
}
