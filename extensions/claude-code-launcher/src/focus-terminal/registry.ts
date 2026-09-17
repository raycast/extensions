import { GhosttyFocusAdapter } from "./adapters/ghostty";
import { ITerm2FocusAdapter } from "./adapters/iterm2";
import { TerminalAppFocusAdapter } from "./adapters/terminal-app";
import { FocusAdapter } from "./types";

const adapters: FocusAdapter[] = [new TerminalAppFocusAdapter(), new ITerm2FocusAdapter(), new GhosttyFocusAdapter()];

export function getFocusAdapter(command: string): FocusAdapter | undefined {
  return adapters.find((adapter) => adapter.matches(command));
}
