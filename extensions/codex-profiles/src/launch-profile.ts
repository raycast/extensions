import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { withDirectoryLock } from "./directory-lock";
import {
  coalesceProfileLaunch,
  findDefaultProfileProcessIDs,
  findProfileProcessIDs,
  serializeProfileLaunch,
} from "./launch-profile-utils";
import type { CodexProfile } from "./profiles";

const execFileAsync = promisify(execFile);
const CHATGPT_BUNDLE_ID = "com.openai.codex";
const PROCESS_LIST_COMMAND = "/bin/ps";
const PROFILE_HOME = join(homedir(), ".codex-profiles");
const LOCK_PATH = join(PROFILE_HOME, ".launch-lock");
const LOCK_WAIT_TIMEOUT_MS = 15_000;
const PROCESS_RECHECK_DELAY_MS = 200;
const PROFILE_RECOVERY_ATTEMPTS = 3;

async function getProfilePIDs(profile: CodexProfile): Promise<number[]> {
  const { stdout } = await execFileAsync(PROCESS_LIST_COMMAND, ["-ww", "-axo", "pid=,command="]);
  if (profile.required) return findDefaultProfileProcessIDs(stdout);
  return findProfileProcessIDs(stdout, join(profile.path, "electron-user-data"));
}

async function waitForProfileToStart(profile: CodexProfile): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if ((await getProfilePIDs(profile)).length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function getWindowCount(pid: number): Promise<number> {
  const script = `tell application "System Events" to count windows of (first application process whose unix id is ${pid})`;
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script]);
  const count = Number(stdout.trim());
  if (!Number.isInteger(count) || count < 0) throw new Error("Could not read the ChatGPT window count.");
  return count;
}

async function activateProfileProcess(pid: number): Promise<void> {
  const script = `tell application "System Events" to set frontmost of (first application process whose unix id is ${pid}) to true`;
  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

async function sendReopenEvent(pid: number): Promise<void> {
  // Target the exact profile process. Addressing ChatGPT by bundle ID could
  // select a different running profile because all instances share that ID.
  const script = `
    ObjC.import("Foundation");
    const target = $.NSAppleEventDescriptor["descriptorWithProcessIdentifier:"](${pid});
    const event = $.NSAppleEventDescriptor["appleEventWithEventClass:eventID:targetDescriptor:returnID:transactionID:"](
      0x61657674, 0x72617070, target, -1, 0
    );
    const error = Ref();
    event["sendEventWithOptions:timeout:error:"](1, 5, error);
    if (error[0]) throw new Error(ObjC.unwrap(error[0].localizedDescription));
  `;
  await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script]);
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim()) {
    return error.stderr.trim();
  }
  return error instanceof Error ? error.message : String(error);
}

async function waitForWindow(pid: number): Promise<boolean> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if ((await getWindowCount(pid)) > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return (await getWindowCount(pid)) > 0;
}

async function restoreRunningProfileWindow(profile: CodexProfile, pid: number): Promise<boolean> {
  try {
    if ((await getWindowCount(pid)) > 0) {
      await activateProfileProcess(pid);
    } else {
      // A plain activation does not recreate a window after the red close
      // button was used. Send macOS's standard reopen event to this exact PID.
      let reopenError: unknown;
      try {
        await sendReopenEvent(pid);
      } catch (error) {
        // Some app handlers report an Apple Event error even after reopening.
        // Verify the actual window state before treating the attempt as failed.
        reopenError = error;
      }
      await activateProfileProcess(pid);
      if (!(await waitForWindow(pid))) {
        const stillRunning = (await getProfilePIDs(profile)).includes(pid);
        if (!stillRunning) return false;

        await showToast({
          style: Toast.Style.Failure,
          title: `${profile.name} is running without a window`,
          message: reopenError
            ? `Tried to restore its window and left the process running. ${errorMessage(reopenError)}`
            : "Tried to restore its window and left the process running.",
        });
        return true;
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Restored ${profile.name} window`,
      message: "Brought the existing ChatGPT profile forward.",
    });
    return true;
  } catch (error) {
    // Never start a second instance when the existing process could not be
    // inspected or activated; leave it alone and report the recovery failure.
    if (!(await getProfilePIDs(profile)).includes(pid)) return false;
    await showFailureToast(error, {
      title: `Couldn't restore ${profile.name} window`,
      message: errorMessage(error),
    });
    return true;
  }
}

async function recoverExistingProfile(profile: CodexProfile): Promise<boolean> {
  let sawRunningProcess = false;

  for (let attempt = 0; attempt < PROFILE_RECOVERY_ATTEMPTS; attempt += 1) {
    let pids = await getProfilePIDs(profile);
    if (pids.length === 0) {
      if (!sawRunningProcess) return false;

      // A replacement process may appear just after the old PID exits.
      await new Promise((resolve) => setTimeout(resolve, PROCESS_RECHECK_DELAY_MS));
      pids = await getProfilePIDs(profile);
      if (pids.length === 0) return false;
    }

    sawRunningProcess = true;
    for (const pid of pids) {
      if (await restoreRunningProfileWindow(profile, pid)) return true;
    }
  }

  // The profile kept changing PIDs while recovery ran. Do not start another
  // instance while any matching process remains alive.
  if ((await getProfilePIDs(profile)).length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${profile.name} is restarting`,
      message: "Left the running process alone to avoid opening a competing profile.",
    });
    return true;
  }
  return false;
}

async function openProfileWindowLocked(profile: CodexProfile): Promise<void> {
  if (await recoverExistingProfile(profile)) return;

  // The required Work folder may not exist on a first launch; create it so
  // the default profile can initialize just like a named profile.
  await mkdir(profile.path, { recursive: true, mode: 0o700 });

  const args = [
    "-n",
    "--env",
    `CODEX_HOME=${profile.path}`,
    "--env",
    `CODEX_SQLITE_HOME=${profile.path}`,
  ];

  if (profile.required) {
    args.push("--env", "CODEX_ELECTRON_USER_DATA_PATH=");
  } else {
    const electronUserData = join(profile.path, "electron-user-data");
    await mkdir(electronUserData, { recursive: true, mode: 0o700 });
    await chmod(electronUserData, 0o700);

    args.push(
      "--env",
      `CODEX_ELECTRON_USER_DATA_PATH=${electronUserData}`,
      "-b",
      CHATGPT_BUNDLE_ID,
      "--args",
      `--user-data-dir=${electronUserData}`,
    );
  }

  if (profile.required) args.push("-b", CHATGPT_BUNDLE_ID);

  // Check again immediately before `open -n`: ChatGPT may have restarted
  // while the profile directories and arguments were being prepared.
  if (await recoverExistingProfile(profile)) return;

  await execFileAsync("/usr/bin/open", args);

  await waitForProfileToStart(profile);

  await showToast({
    style: Toast.Style.Success,
    title: `Opened ${profile.name} window`,
    message: profile.required
      ? "Opened the default Work ChatGPT window. Other profiles can stay open beside it."
      : "Opened with separate ChatGPT app data; sign in once if prompted.",
  });
}

export async function openProfileWindow(profile: CodexProfile): Promise<void> {
  try {
    await coalesceProfileLaunch(profile.id, () =>
      serializeProfileLaunch(async () => {
        await mkdir(PROFILE_HOME, { recursive: true, mode: 0o700 });
        return withDirectoryLock(
          LOCK_PATH,
          () => openProfileWindowLocked(profile),
          { waitTimeoutMs: LOCK_WAIT_TIMEOUT_MS, timeoutMessage: "A profile is already being opened. Try again shortly." },
        );
      }),
    );
  } catch (error) {
    await showFailureToast(error, {
      title: `Couldn't open ${profile.name}`,
    });
  }
}
