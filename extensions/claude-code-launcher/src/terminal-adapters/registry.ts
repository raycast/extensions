import { TerminalAdapter } from "./types";
import { TerminalAppAdapter } from "./adapters/terminal-app";
import { AlacrittyAdapter } from "./adapters/alacritty";

const adapters: Record<string, TerminalAdapter> = {
  Terminal: new TerminalAppAdapter(),
  Alacritty: new AlacrittyAdapter(),
};

export function getTerminalAdapter(terminalApp: string): TerminalAdapter | undefined {
  return adapters[terminalApp];
}
