import { Toast, showToast } from "@raycast/api";

import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp } from "../detect";
import { execFileAsync } from "../exec";

function commandArgs(request: LaunchRequest): string[] {
  return request.command
    ? ["-e", request.shellPath, "-lc", request.command]
    : [];
}

async function launchNew(request: LaunchRequest): Promise<void> {
  await execFileAsync("kitty", [
    "--directory",
    request.cwd,
    ...commandArgs(request),
  ]);
}

export const kittyLauncher: TerminalLauncher = {
  type: "kitty",
  title: "kitty",
  reuseSupport: "requiresUserSetup",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("kitty", "kitty.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    if (request.reuseWindow) {
      try {
        await execFileAsync("kitten", [
          "@",
          "launch",
          "--cwd",
          request.cwd,
          ...(request.command
            ? [request.shellPath, "-lc", request.command]
            : []),
        ]);
        return;
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "kitty remote control failed",
          message:
            "Falling back to a new kitty window. Enable allow_remote_control for reuse.",
        });
      }
    }

    await launchNew(request);
  },
};
