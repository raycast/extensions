import path from "node:path";
import { environment, Keyboard } from "@raycast/api";

/** Path to downloaded user favicon files */
export const SUPPORT_DIR = path.join(environment.supportPath, "favicones");

/** ctrl-x shortcut */
export const CTRL_X: Keyboard.Shortcut = { modifiers: ["ctrl"], key: "x" };

/** cmd-space (MacOS) and alt-space (Windows) shortcut */
export const CMD_SPACE: Keyboard.Shortcut = {
  Windows: {
    modifiers: ["alt"],
    key: "return",
  },
  macOS: {
    modifiers: ["cmd"],
    key: "return",
  },
};
