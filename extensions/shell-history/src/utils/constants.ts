import { getDefaultApplication } from "@raycast/api";
import { Terminal } from "../types/types";

export const TERMINAL = "/System/Applications/Utilities/Terminal.app";
export const ITERM2 = "/Applications/iTerm.app";
export const WARP = "/Applications/Warp.app";
export const HYPER = "/Applications/Hyper.app";
export const GHOSTTY = "/Applications/Ghostty.app";
const terminalPath = [
  { path: TERMINAL, supportInput: true, key: "t" },
  { path: ITERM2, supportInput: true, key: "i" },
  { path: WARP, supportInput: false, key: "w" },
  { path: HYPER, supportInput: false, key: "h" },
  { path: GHOSTTY, supportInput: false, key: "g" },
];

export const getTerminals = async () => {
  const terminals: Terminal[] = [];
  for (const terminal of terminalPath) {
    try {
      const app = await getDefaultApplication(terminal.path);
      terminals.push({ application: app, supportInput: terminal.supportInput, key: terminal.key });
    } catch (e) {
      // Ignore
    }
  }
  return terminals;
};

export enum CacheKey {
  ShowDetail = "showDetail",
}
