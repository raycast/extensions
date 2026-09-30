import { Toast, showToast } from "@raycast/api";
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

async function openProfileWindowLocked(profile: CodexProfile): Promise<void> {
  const existingPIDs = await getProfilePIDs(profile);
  if (existingPIDs.length > 0) {
    await showToast({
      style: Toast.Style.Success,
      title: `${profile.name} is already running`,
      message: "No new window was opened.",
    });
    return;
  }

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
    await showToast({
      style: Toast.Style.Failure,
      title: `Couldn't open ${profile.name}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
