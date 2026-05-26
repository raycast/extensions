import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp } from "../detect";
import { execFileAsync } from "../exec";
import { toAppleScriptString } from "../shell-quote";

export const ghosttyLauncher: TerminalLauncher = {
  type: "ghostty",
  title: "Ghostty",
  reuseSupport: "bestEffort",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("ghostty", "Ghostty.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    const commandStatements = request.command
      ? `
  input text ${toAppleScriptString(request.command)} to rootTerminal
  send key "enter" to rootTerminal`
      : "";

    const script = `
tell application "Ghostty"
  activate
  set cfgRoot to new surface configuration
  set initial working directory of cfgRoot to ${toAppleScriptString(request.cwd)}
  set rootWindow to new window with configuration cfgRoot
  set rootTerminal to focused terminal of selected tab of rootWindow
${commandStatements}
end tell
`;

    await execFileAsync("osascript", ["-e", script]);
  },
};
