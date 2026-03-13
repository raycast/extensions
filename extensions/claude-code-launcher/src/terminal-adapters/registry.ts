import { TerminalAdapter } from "./types";
import { TerminalAppAdapter } from "./adapters/terminal-app";
import { AlacrittyAdapter } from "./adapters/alacritty";
import { GhosttyAdapter } from "./adapters/ghostty";
import { WarpAdapter } from "./adapters/warp";

const adapters: Record<string, TerminalAdapter> = {
  Terminal: new TerminalAppAdapter(),
  Alacritty: new AlacrittyAdapter(),
  Ghostty: new GhosttyAdapter(),
  Warp: new WarpAdapter(),
};

export function getTerminalAdapter(terminalApp: string): TerminalAdapter | undefined {
  return adapters[terminalApp];
}
