import path from "node:path";
import { environment, Keyboard } from "@raycast/api";

/** Path to downloaded user favicon files */
export const SUPPORT_DIR = path.join(environment.supportPath, "favicones");

/** ctrl-x shortcut */
export const CTRL_X: Keyboard.Shortcut = { modifiers: ["ctrl"], key: "x" };

/** cmd-return shortcut (macOS) */
export const CMD_SPACE_MACOS: Keyboard.Shortcut = { modifiers: ["cmd"], key: "return" };

/** alt-return shortcut (Windows) */
export const CMD_SPACE_WINDOWS: Keyboard.Shortcut = { modifiers: ["alt"], key: "return" };
