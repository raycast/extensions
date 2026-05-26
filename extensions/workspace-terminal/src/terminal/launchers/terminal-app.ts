import { existsSync } from "fs";

import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { execFileAsync } from "../exec";
import { shellCd, toAppleScriptString } from "../shell-quote";

function buildTerminalCommand(request: LaunchRequest): string {
  return request.command
    ? `${shellCd(request.cwd)} && clear && ${request.command}`
    : shellCd(request.cwd);
}

export const terminalAppLauncher: TerminalLauncher = {
  type: "terminal",
  title: "Terminal",
  reuseSupport: "supported",
  async checkInstalled(): Promise<TerminalDetection> {
    const appPath = "/System/Applications/Utilities/Terminal.app";
    return {
      installed: existsSync(appPath),
      appPath,
    };
  },
  async launch(request: LaunchRequest): Promise<void> {
    const command = toAppleScriptString(buildTerminalCommand(request));
    const target = request.reuseWindow
      ? `do script ${command} in front window`
      : `do script ${command}`;
    const script = `
tell application "Terminal"
  activate
  ${target}
end tell
`;

    await execFileAsync("osascript", ["-e", script]);
  },
};
