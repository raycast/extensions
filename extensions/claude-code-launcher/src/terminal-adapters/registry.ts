import { TerminalAdapter } from "./types";
import { TerminalAppAdapter } from "./adapters/terminal-app";
import { AlacrittyAdapter } from "./adapters/alacritty";
import { GhosttyAdapter } from "./adapters/ghostty";
import { WarpAdapter } from "./adapters/warp";
import { ITerm2Adapter } from "./adapters/iterm2";

const adapters: Record<string, TerminalAdapter> = {
  Terminal: new TerminalAppAdapter(),
  Alacritty: new AlacrittyAdapter(),
  Ghostty: new GhosttyAdapter(),
  Warp: new WarpAdapter(),
  iTerm2: new ITerm2Adapter(),
};

export function getTerminalAdapter(terminalApp: string): TerminalAdapter | undefined {
  return adapters[terminalApp];
}
