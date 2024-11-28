import { getDefaultApplication } from "@raycast/api";
import { Terminal } from "../types/types";

export const TERMINAL = "/System/Applications/Utilities/Terminal.app";
export const ITERM2 = "/Applications/iTerm.app";
export const WARP = "/Applications/Warp.app";
export const HYPER = "/Applications/Hyper.app";
const terminalPath = [
  { path: TERMINAL, supportInput: true },
  { path: ITERM2, supportInput: true },
  { path: WARP, supportInput: false },
  { path: HYPER, supportInput: false },
];

export const getTerminals = async () => {
  const terminals: Terminal[] = [];
  for (const terminal of terminalPath) {
    try {
      const app = await getDefaultApplication(terminal.path);
      terminals.push({ application: app, supportInput: terminal.supportInput });
    } catch (e) {
      console.error("Application not found: ", terminal);
    }
  }
  return terminals;
};

export enum CacheKey {
  ShowDetail = "showDetail",
}
