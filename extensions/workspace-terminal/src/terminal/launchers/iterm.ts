import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp } from "../detect";
import { execFileAsync } from "../exec";
import { shellCd, toAppleScriptString } from "../shell-quote";

function buildFallbackCommand(request: LaunchRequest): string {
  return request.command
    ? `${shellCd(request.cwd)} && clear && ${request.command}`
    : shellCd(request.cwd);
}

export const itermLauncher: TerminalLauncher = {
  type: "iterm",
  title: "iTerm",
  reuseSupport: "supported",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("iterm2", "iTerm.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    const url = request.command
      ? `iterm2:/command?c=${encodeURIComponent(request.command)}&d=${encodeURIComponent(request.cwd)}`
      : `iterm2:/command?d=${encodeURIComponent(request.cwd)}`;

    try {
      await execFileAsync("open", [url]);
      return;
    } catch {
      const script = `
tell application "iTerm"
  activate
  create window with default profile
  tell current session of current window
    write text ${toAppleScriptString(buildFallbackCommand(request))}
  end tell
end tell
`;

      await execFileAsync("osascript", ["-e", script]);
    }
  },
};
