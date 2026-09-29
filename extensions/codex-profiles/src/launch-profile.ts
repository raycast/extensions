import { Toast, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { chmod, mkdir, rmdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { coalesceProfileLaunch, findProfileProcessIDs, recoveryActionForWindowCount } from "./launch-profile-utils";
import type { CodexProfile } from "./profiles";

const execFileAsync = promisify(execFile);
const CHATGPT_BUNDLE_ID = "com.openai.codex";
const PROCESS_LIST_COMMAND = "/bin/ps";
const APPLESCRIPT_COMMAND = "/usr/bin/osascript";
const LOCK_ROOT = join(homedir(), ".codex-profiles", ".launch-locks");
const LOCK_WAIT_TIMEOUT_MS = 15_000;
const STALE_LAUNCH_LOCK_MS = 60_000;

async function getSecondaryProfilePIDs(userDataPath: string): Promise<number[]> {
  const { stdout } = await execFileAsync(PROCESS_LIST_COMMAND, ["-ww", "-axo", "pid=,command="]);
  return findProfileProcessIDs(stdout, userDataPath);
}

async function inspectProfileWindow(pid: number): Promise<"active" | "windowless" | "unavailable"> {
  const script = `
on run argv
  set targetPID to (item 1 of argv) as integer
  tell application "System Events"
    set targetProcess to first application process whose unix id is targetPID
    set windowCount to count of windows of targetProcess
    if windowCount is 0 then
      delay 2
      set windowCount to count of windows of targetProcess
    end if
    if windowCount > 0 then
      set frontmost of targetProcess to true
    end if
    return windowCount as text
  end tell
end run`;

  try {
    const { stdout } = await execFileAsync(APPLESCRIPT_COMMAND, ["-e", script, String(pid)]);
    const result = stdout.trim();
    if (!result) return "unavailable";
    const windowCount = Number(result);
    const action = recoveryActionForWindowCount(windowCount);
    return action === "activate" ? "active" : action === "restart" ? "windowless" : "unavailable";
  } catch {
    // macOS may deny Raycast access to System Events. Don't block the switch;
    // the caller will still submit a fresh launch request for this profile.
    return "unavailable";
  }
}

async function waitForProfileToQuit(userDataPath: string): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if ((await getSecondaryProfilePIDs(userDataPath)).length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("ChatGPT did not quit. Quit that profile normally, then try again.");
}

async function waitForProfileToStart(userDataPath: string): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if ((await getSecondaryProfilePIDs(userDataPath)).length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function terminateWindowlessProfile(pid: number, userDataPath: string): Promise<void> {
  // Reconfirm the PID still belongs to this exact profile before signaling it.
  if (!(await getSecondaryProfilePIDs(userDataPath)).includes(pid)) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

async function withLaunchLock<T>(profileID: string, operation: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_ROOT, { recursive: true, mode: 0o700 });
  const lockPath = join(LOCK_ROOT, profileID);
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;

  while (true) {
    try {
      await mkdir(lockPath, { mode: 0o700 });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const lockInfo = await stat(lockPath).catch(() => undefined);
      if (lockInfo && Date.now() - lockInfo.mtimeMs > STALE_LAUNCH_LOCK_MS) {
        await rmdir(lockPath).catch(() => undefined);
        continue;
      }
      if (Date.now() >= deadline) throw new Error("This profile is already being opened. Try again shortly.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  try {
    return await operation();
  } finally {
    await rmdir(lockPath).catch(() => undefined);
  }
}

async function openProfileWindowLocked(profile: CodexProfile): Promise<void> {
  // The required Work folder may not exist on a first launch; create it so
  // the default profile can initialize just like a named profile.
  await mkdir(profile.path, { recursive: true, mode: 0o700 });

  let restartedWindowlessInstance = false;
  let automationFallback = false;
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

    const existingPIDs = await getSecondaryProfilePIDs(electronUserData);
    for (const pid of existingPIDs) {
      const state = await inspectProfileWindow(pid);
      if (state === "active") {
        await showToast({
          style: Toast.Style.Success,
          title: `Opened ${profile.name} window`,
          message: "Brought its existing ChatGPT window forward.",
        });
        return;
      }
      if (state === "unavailable") {
        automationFallback = true;
        break;
      }

      await terminateWindowlessProfile(pid, electronUserData);
      restartedWindowlessInstance = true;
    }

    if (restartedWindowlessInstance) await waitForProfileToQuit(electronUserData);

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
  await execFileAsync("/usr/bin/open", args);

  if (!profile.required) {
    const electronUserData = join(profile.path, "electron-user-data");
    await waitForProfileToStart(electronUserData);
  }

  await showToast({
    style: Toast.Style.Success,
    title: `Opened ${profile.name} window`,
    message: automationFallback
      ? "ChatGPT received a fresh launch request. Allow Raycast to control System Events to reuse an existing window."
      : profile.required
        ? "Opened the default Work ChatGPT window. Other profiles can stay open beside it."
        : restartedWindowlessInstance
          ? "Restarted its windowless ChatGPT process and reopened the profile."
          : "Opened with separate ChatGPT app data; sign in once if prompted.",
  });
}

export async function openProfileWindow(profile: CodexProfile): Promise<void> {
  try {
    await coalesceProfileLaunch(profile.id, () => withLaunchLock(profile.id, () => openProfileWindowLocked(profile)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Couldn't open ${profile.name}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
