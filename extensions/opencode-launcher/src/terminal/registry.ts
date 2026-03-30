import { alacrittyAdapter } from "./adapters/alacritty";
import { ghosttyAdapter } from "./adapters/ghostty";
import { iTerm2Adapter } from "./adapters/iterm2";
import { terminalAppAdapter } from "./adapters/terminal-app";
import { warpAdapter } from "./adapters/warp";
import type { TerminalAdapter } from "./types";

const terminalAdapters: Record<string, TerminalAdapter> = {
  Terminal: terminalAppAdapter,
  iTerm2: iTerm2Adapter,
  Warp: warpAdapter,
  Ghostty: ghosttyAdapter,
  Alacritty: alacrittyAdapter,
};

export function getTerminalAdapter(name: string): TerminalAdapter {
  return terminalAdapters[name] ?? terminalAdapters.Terminal;
}

export function getAvailableTerminals(): string[] {
  return Object.keys(terminalAdapters);
}
