import { showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { env } from "./config";

// bash (used by the resurrect script's `#!/usr/bin/env bash` shebang) and pgrep
// live in /bin and /usr/bin, which the extension's restricted PATH omits
const scriptEnv = { ...env, PATH: `${env.PATH}:/bin:/usr/bin:/usr/sbin:/sbin` };

const SAVE_TIMEOUT_MS = 600000;
const WAIT_FOR_RUNNING_MS = 240000;
const CONTINUUM_TIMESTAMP_OPTION = "@continuum-save-last-timestamp";

function tmux(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("tmux", args, { env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function isSaveRunning(scriptPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // The resurrect save runs as `bash <scriptPath> quiet`, whether launched by
    // this command, `prefix + Ctrl-s`, or tmux-continuum's background timer
    execFile("pgrep", ["-f", scriptPath], { env: scriptEnv }, (_error, stdout) => {
      resolve(stdout.trim().length > 0);
    });
  });
}

async function waitForNoRunningSave(scriptPath: string): Promise<boolean> {
  const start = Date.now();

  while (await isSaveRunning(scriptPath)) {
    if (Date.now() - start > WAIT_FOR_RUNNING_MS) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return true;
}

function runSaveScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // "quiet" suppresses the plugin's own tmux status message; we report via HUD.
    // The save can take a while with @resurrect-capture-pane-contents on and many
    // panes, so allow a generous timeout and buffer.
    execFile(
      scriptPath,
      ["quiet"],
      { env: scriptEnv, timeout: SAVE_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve();
      },
    );
  });
}

function nowUnix(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving tmux sessions…" });

  let scriptPath: string;

  try {
    scriptPath = await tmux(["show-option", "-gqv", "@resurrect-save-script-path"]);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    toast.style = Toast.Style.Failure;
    toast.title = message.includes("no server") ? "No tmux server running" : "Could not reach tmux 😢";
    toast.message = message;
    return;
  }

  if (!scriptPath) {
    toast.style = Toast.Style.Failure;
    toast.title = "tmux-resurrect not configured";
    toast.message = "Install and set up tmux-resurrect to save sessions";
    return;
  }

  // If tmux-continuum is active, mark a save as happening now via its own public
  // option so its interval guard backs off and it won't launch a competing save.
  // Concurrent saves write shared files (pane_contents.tar.gz, the `last` pointer)
  // and can corrupt the snapshot — which is exactly what this command exists to
  // guarantee against.
  let continuumActive = false;

  try {
    continuumActive = (await tmux(["show-option", "-gqv", CONTINUUM_TIMESTAMP_OPTION])).length > 0;
  } catch {
    // continuum not installed; nothing to coordinate with
  }

  if (continuumActive) {
    try {
      await tmux(["set-option", "-g", CONTINUUM_TIMESTAMP_OPTION, nowUnix()]);
    } catch {
      // best effort
    }
  }

  // Serialize behind any save already in progress rather than overlapping it
  if (await isSaveRunning(scriptPath)) {
    toast.title = "Waiting for an in-progress save…";

    if (!(await waitForNoRunningSave(scriptPath))) {
      toast.style = Toast.Style.Failure;
      toast.title = "A save is already in progress";
      toast.message = "Try again in a moment";
      return;
    }

    toast.title = "Saving tmux sessions…";
  }

  try {
    await runSaveScript(scriptPath);

    // Reflect the completed save so continuum's next automatic save is a full
    // interval away from this one
    if (continuumActive) {
      try {
        await tmux(["set-option", "-g", CONTINUUM_TIMESTAMP_OPTION, nowUnix()]);
      } catch {
        // best effort
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = "Tmux sessions saved";
    await showHUD("✓ Tmux sessions saved");
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save tmux sessions 😢";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
