import { showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { env } from "./config";

// The resurrect save script has a `#!/usr/bin/env bash` shebang; env resolves
// bash from PATH, and bash lives in /bin, which the extension's restricted PATH
// omits — so add the system bin dirs for that subprocess.
const scriptEnv = { ...env, PATH: `${env.PATH}:/bin:/usr/bin:/usr/sbin:/sbin` };

const SAVE_TIMEOUT_MS = 600000;
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

  // Serializing saves is the save script's job, not this command's: tmux-resurrect
  // itself (and `prefix + Ctrl-s`) run it without a cross-process lock, and users
  // who auto-save frequently wrap the script in their own mutex. This command just
  // invokes the configured script and lets it decide, so it never blocks waiting
  // on a slow or piled-up save. We still nudge continuum to back off (below) to
  // reduce the chance of a competing automatic save.
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

  try {
    await runSaveScript(scriptPath);

    // Reflect the save so continuum's next automatic save is a full interval away
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
