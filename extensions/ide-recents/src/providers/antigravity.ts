import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

export const antigravityProvider: IDEProvider = {
  id: "antigravity",
  name: "Antigravity",
  color: "#E84855",

  getDatabasePaths() {
    const home = homedir();
    return [path.join(home, "Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb")];
  },

  getOpenCommands(projectPath: string) {
    const home = homedir();
    const cliPaths = [
      path.join(home, ".antigravity-ide/antigravity-ide/bin/antigravity-ide"),
      "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide",
    ];

    return [
      ...cliPaths.map((command) => ({ command, args: [projectPath] })),
      { command: "antigravity-ide", args: [projectPath] },
      {
        command: "/usr/bin/open",
        args: ["-b", "com.google.antigravity-ide", projectPath],
      },
      {
        command: "/usr/bin/open",
        args: ["-a", "Antigravity IDE", projectPath],
      },
    ];
  },
};
