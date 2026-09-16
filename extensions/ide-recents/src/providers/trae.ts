import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

/** Trae CLI 的候选绝对路径（按优先级尝试） */
const TRAE_CLI_PATHS = [
  "/usr/local/bin/trae",
  "/opt/homebrew/bin/trae",
  "/Applications/Trae.app/Contents/Resources/app/bin/marscode",
];

export const traeProvider: IDEProvider = {
  id: "trae",
  name: "Trae",
  color: "#6B4FBB",

  getDatabasePaths() {
    const home = homedir();
    return [
      path.join(
        home,
        "Library/Application Support/Trae/User/globalStorage/state.vscdb",
      ),
    ];
  },

  getOpenCommands(projectPath: string) {
    return [
      ...TRAE_CLI_PATHS.map((command) => ({ command, args: [projectPath] })),
      { command: "/usr/bin/open", args: ["-b", "com.trae.app", projectPath] },
      { command: "/usr/bin/open", args: ["-a", "Trae", projectPath] },
      {
        command: "/usr/bin/open",
        args: ["-a", "/Applications/Trae.app", projectPath],
      },
      { command: "trae", args: [projectPath] },
    ];
  },
};
