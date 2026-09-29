import { Toast, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, chmod, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { CodexProfile } from "./profiles";

const execFileAsync = promisify(execFile);
const CHATGPT_BUNDLE_ID = "com.openai.codex";
const PROCESS_LIST_COMMAND = "/bin/ps";
const APPLESCRIPT_COMMAND = "/usr/bin/osascript";

async function getSecondaryProfilePIDs(userDataPath: string): Promise<number[]> {
  const { stdout } = await execFileAsync(PROCESS_LIST_COMMAND, ["-ww", "-axo", "pid=,command="]);
  return stdout
    .split("\n")
    .flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return [];

      const [, pidText, command] = match;
      if (
        !command.includes("/ChatGPT.app/Contents/MacOS/") ||
        command.includes("--type=") ||
        !command.includes(`--user-data-dir=${userDataPath}`)
      ) {
        return [];
      }

      return [Number(pidText)];
    });
}

async function activateOrCloseWindowlessInstance(pid: number): Promise<"active" | "closing"> {
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
      return "active"
    end if
    set frontmost of targetProcess to true
    keystroke "q" using {command down}
    return "closing"
  end tell
end run`;

  const { stdout } = await execFileAsync(APPLESCRIPT_COMMAND, ["-e", script, String(pid)]);
  return stdout.trim() === "active" ? "active" : "closing";
}

async function waitForProfileToQuit(userDataPath: string): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if ((await getSecondaryProfilePIDs(userDataPath)).length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("ChatGPT did not quit. Quit that profile normally, then try again.");
}

export async function openProfileWindow(profile: CodexProfile): Promise<void> {
  try {
    await access(profile.path);
    let restartedWindowlessInstance = false;
    const args = [
      // Launch every profile as its own ChatGPT instance. Without -n, macOS
      // may activate a different running profile and ignore these env vars.
      "-n",
      "--env",
      `CODEX_HOME=${profile.path}`,
      "--env",
      `CODEX_SQLITE_HOME=${profile.path}`,
    ];

    if (profile.required) {
      // Keep the normal ChatGPT app instance as the Work/default profile,
      // matching what opens from the Dock or Finder.
      args.push("--env", "CODEX_ELECTRON_USER_DATA_PATH=");
    } else {
      const electronUserData = join(profile.path, "electron-user-data");
      await mkdir(electronUserData, { recursive: true, mode: 0o700 });
      await chmod(electronUserData, 0o700);

      const existingPIDs = await getSecondaryProfilePIDs(electronUserData);
      for (const pid of existingPIDs) {
        const state = await activateOrCloseWindowlessInstance(pid);
        if (state === "active") {
          await showToast({
            style: Toast.Style.Success,
            title: `Opened ${profile.name} window`,
            message: "Brought its existing ChatGPT window forward.",
          });
          return;
        }
      }
      if (existingPIDs.length > 0) {
        restartedWindowlessInstance = true;
        await waitForProfileToQuit(electronUserData);
      }

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

    await showToast({
      style: Toast.Style.Success,
      title: `Opened ${profile.name} window`,
      message: profile.required
        ? "Opened the default Work ChatGPT window. Other profiles can stay open beside it."
        : restartedWindowlessInstance
          ? "Restarted its windowless ChatGPT process and reopened the profile."
          : "Opened with separate ChatGPT app data; sign in once if prompted.",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Couldn't open ${profile.name}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
