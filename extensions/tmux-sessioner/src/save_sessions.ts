import { showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { env } from "./config";

function tmuxOption(name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // -g global, -q quiet (no error if unset), -v value only
    execFile("tmux", ["show-option", "-gqv", name], { env }, (error, stdout, stderr) => {
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
    // The resurrect script has a `#!/usr/bin/env bash` shebang; env resolves bash
    // from PATH, and bash lives in /bin, which the extension's restricted PATH
    // omits — so add the system bin dirs for this subprocess.
    const scriptEnv = { ...env, PATH: `${env.PATH}:/bin:/usr/sbin:/sbin` };

    execFile(
      scriptPath,
      ["quiet"],
      { env: scriptEnv, timeout: 600000, maxBuffer: 64 * 1024 * 1024 },
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

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving tmux sessions…" });

  let scriptPath: string;

  try {
    scriptPath = await tmuxOption("@resurrect-save-script-path");
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

  try {
    await runSaveScript(scriptPath);

    toast.style = Toast.Style.Success;
    toast.title = "Tmux sessions saved";
    await showHUD("✓ Tmux sessions saved");
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save tmux sessions 😢";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
