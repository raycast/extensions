import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

/** Candidate absolute paths of the VS Code CLI, tried in order */
const VSCODE_CLI_PATHS = [
  "/usr/local/bin/code",
  "/opt/homebrew/bin/code",
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
];

export const vscodeProvider: IDEProvider = {
  id: "vscode",
  name: "VS Code",
  color: "#007ACC",

  getDatabasePaths() {
    const home = homedir();
    return [
      // VS Code 1.118+ shared storage (stores recents under `history.recentlyOpenedPathsList`)
      path.join(home, ".vscode-shared/sharedStorage/state.vscdb"),
      // Classic per-user global storage (stores recents under `recently.opened`)
      path.join(home, "Library/Application Support/Code/User/globalStorage/state.vscdb"),
      // Code - Insiders
      path.join(home, "Library/Application Support/Code - Insiders/User/globalStorage/state.vscdb"),
    ];
  },

  getOpenCommands(projectPath: string) {
    return [
      ...VSCODE_CLI_PATHS.map((command) => ({ command, args: [projectPath] })),
      {
        command: "/usr/bin/open",
        args: ["-b", "com.microsoft.VSCode", projectPath],
      },
      { command: "code", args: [projectPath] },
      { command: "code-next", args: [projectPath] },
      {
        command: "/usr/bin/open",
        args: ["-a", "Visual Studio Code", projectPath],
      },
    ];
  },
};
