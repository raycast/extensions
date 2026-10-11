import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import { userInfo } from "node:os";
import { promisify } from "node:util";
import { hasManagedGrant, parseSleepDisabled, permissionScript, POLICY_PATH, shellQuote } from "./policy";

const run = promisify(execFile);
export type SleepState = { disabled: boolean; quickSwitchingInstalled: boolean };

export class ApprovalCancelled extends Error {
  constructor() {
    super("Administrator approval was cancelled.");
  }
}

async function approve(command: string, prompt: string): Promise<void> {
  try {
    await runAppleScript(
      `on run argv
        do shell script (item 1 of argv) with prompt (item 2 of argv) with administrator privileges
      end run`,
      [command, prompt],
      { timeout: 180000 },
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (/\(-128\)|user cancel(?:ed|led)/i.test(details)) throw new ApprovalCancelled();
    if (details.includes("SLEEP_CONTROL_POLICY_CONFLICT")) {
      throw new Error("A different quick-switching permission already exists. No permission changes were made.");
    }
    if (details.includes("SLEEP_CONTROL_POLICY_UNSUPPORTED")) {
      throw new Error("This Mac does not support this permission setup. Use macOS approval for each change instead.");
    }
    throw new Error("macOS could not complete the approval. Try again with an administrator account.");
  }
}

async function hasManagedRule(): Promise<boolean> {
  try {
    const file = await lstat(POLICY_PATH);
    if (!file.isFile() || file.uid !== 0 || file.gid !== 0 || (file.mode & 0o777) !== 0o440) return false;
    const { stdout } = await run("/usr/bin/sudo", ["-n", "-ll"], {
      timeout: 5000,
      env: { ...process.env, LC_ALL: "C" },
    });
    return hasManagedGrant(stdout);
  } catch {
    // This reports our installed grant, not effective sudoers precedence.
    // Every switch tries sudo non-interactively and falls back to macOS approval.
    return false;
  }
}

export async function readSleepState(): Promise<SleepState> {
  const [{ stdout }, quickSwitchingInstalled] = await Promise.all([
    run("/usr/bin/pmset", ["-g"], { timeout: 5000 }),
    hasManagedRule(),
  ]);
  return { disabled: parseSleepDisabled(stdout), quickSwitchingInstalled };
}

export async function changeSleepState(disabled: boolean): Promise<void> {
  const args = ["-a", "disablesleep", disabled ? "1" : "0"];
  try {
    await run("/usr/bin/sudo", ["-n", "/usr/bin/pmset", ...args], { timeout: 5000 });
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "");
    if (!/password|not allowed|not permitted|sudoers|terminal is required/i.test(stderr)) throw error;
    await approve(
      `/usr/bin/pmset ${args.join(" ")}`,
      disabled
        ? "Sleep Control wants to keep your Mac awake, including with the lid closed."
        : "Sleep Control wants to allow your Mac to sleep normally.",
    );
  }
  if ((await readSleepState()).disabled !== disabled) {
    throw new Error("The sleep setting could not be verified. Refresh to see the current state.");
  }
}

export async function changeQuickSwitching(enabled: boolean): Promise<void> {
  const script = permissionScript(userInfo().username, enabled ? "install" : "remove");
  await approve(
    `/bin/sh -c ${shellQuote(script)}`,
    enabled
      ? "Allow your account to switch Mac sleep on or off without further password prompts. Only these two sleep commands are permitted."
      : "Remove Sleep Control’s password-free permission. Your sleep setting will stay unchanged.",
  );
  if ((await hasManagedRule()) !== enabled) {
    throw new Error("The quick-switching permission could not be verified. Try refreshing.");
  }
}
