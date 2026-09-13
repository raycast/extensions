import { homedir } from "os";
import path from "path";
import type { IDEProvider } from "./types";

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
      `/usr/local/bin/trae "${projectPath}"`,
      `"/Applications/Trae.app/Contents/Resources/app/bin/marscode" "${projectPath}"`,
      `open -b com.trae.app "${projectPath}"`,
      `open -a "Trae" "${projectPath}"`,
      `open -a "/Applications/Trae.app" "${projectPath}"`,
      `trae "${projectPath}"`,
    ];
  },
};
