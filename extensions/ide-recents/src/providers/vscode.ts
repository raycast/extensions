import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

export const vscodeProvider: IDEProvider = {
  id: "vscode",
  name: "VS Code",
  color: "#007ACC",

  getDatabasePaths() {
    const home = homedir();
    return [
      // VS Code 1.118+ 新版共享存储
      path.join(home, ".vscode-shared/sharedStorage/state.vscdb"),
      // macOS 传统全局用户存储
      path.join(
        home,
        "Library/Application Support/Code/User/globalStorage/state.vscdb",
      ),
      // Code - Insiders
      path.join(
        home,
        "Library/Application Support/Code - Insiders/User/globalStorage/state.vscdb",
      ),
    ];
  },

  getOpenCommands(projectPath: string) {
    return [
      `/usr/local/bin/code "${projectPath}"`,
      `"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "${projectPath}"`,
      `open -b com.microsoft.VSCode "${projectPath}"`,
      `code "${projectPath}"`,
      `code-next "${projectPath}"`,
      `open -a "Visual Studio Code" "${projectPath}"`,
    ];
  },
};
