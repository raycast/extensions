import { Toast, showToast } from "@raycast/api";

import type { CommandMode, TerminalType } from "../types";
import { buildCommandForMode } from "./shell-quote";
import type { LaunchRequest, TerminalLauncher } from "./types";
import { alacrittyLauncher } from "./launchers/alacritty";
import { ghosttyLauncher } from "./launchers/ghostty";
import { itermLauncher } from "./launchers/iterm";
import { kittyLauncher } from "./launchers/kitty";
import { terminalAppLauncher } from "./launchers/terminal-app";
import { warpLauncher } from "./launchers/warp";
import { weztermLauncher } from "./launchers/wezterm";

const LAUNCH_DEDUP_MS = 1200;

let lastLaunch: { projectPath: string; at: number } | undefined;

const launchers: Record<TerminalType, TerminalLauncher> = {
  ghostty: ghosttyLauncher,
  iterm: itermLauncher,
  terminal: terminalAppLauncher,
  warp: warpLauncher,
  kitty: kittyLauncher,
  alacritty: alacrittyLauncher,
  wezterm: weztermLauncher,
};

export function getTerminalLauncher(type: TerminalType): TerminalLauncher {
  return launchers[type] ?? ghosttyLauncher;
}

function isDuplicateLaunch(projectPath: string): boolean {
  const now = Date.now();
  if (
    lastLaunch &&
    lastLaunch.projectPath === projectPath &&
    now - lastLaunch.at < LAUNCH_DEDUP_MS
  ) {
    return true;
  }

  lastLaunch = { projectPath, at: now };
  return false;
}

export async function launchInTerminal(
  type: TerminalType,
  request: Omit<LaunchRequest, "command"> & {
    rawCommand?: string;
    commandMode: CommandMode;
  },
): Promise<void> {
  if (isDuplicateLaunch(request.project.rootPath)) {
    return;
  }

  const launcher = getTerminalLauncher(type);
  const detection = await launcher.checkInstalled();
  if (!detection.installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${launcher.title} is not installed`,
      message:
        "Install the terminal or choose another terminal in preferences.",
    });
    return;
  }

  if (request.reuseWindow && launcher.reuseSupport === "none") {
    await showToast({
      style: Toast.Style.Failure,
      title: `${launcher.title} cannot reuse windows`,
      message: "Opening a new window instead.",
    });
  }

  await launcher.launch({
    project: request.project,
    cwd: request.cwd,
    command: buildCommandForMode(
      request.rawCommand,
      request.commandMode,
      request.shellPath,
    ),
    reuseWindow: request.reuseWindow,
    shellPath: request.shellPath,
  });
}
