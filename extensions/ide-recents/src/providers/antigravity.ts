import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

export const antigravityProvider: IDEProvider = {
  id: "antigravity",
  name: "Antigravity",
  color: "#E84855",

  getDatabasePaths() {
    const home = homedir();
    return [
      path.join(
        home,
        "Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb",
      ),
    ];
  },

  getOpenCommands(projectPath: string) {
    const home = homedir();
    return [
      path.join(home, ".antigravity-ide/antigravity-ide/bin/antigravity-ide") +
        ` "${projectPath}"`,
      `antigravity-ide "${projectPath}"`,
      `"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" "${projectPath}"`,
      `open -b com.google.antigravity-ide "${projectPath}"`,
      `open -a "Antigravity IDE" "${projectPath}"`,
    ];
  },
};
