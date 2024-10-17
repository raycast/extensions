import { runInIterm, runInKitty, runInTerminal, runInWarp } from "./runInShellFunctions";

export const TERMINAL_TYPES = { iterm: "iterm", kitty: "kitty", warp: "warp", terminal: "terminal" } as const;

export const TERMINAL_TYPES_CONFIG = {
  [TERMINAL_TYPES.iterm]: { name: "iTerm", function: runInIterm },
  [TERMINAL_TYPES.kitty]: { name: "kitty", function: runInKitty },
  [TERMINAL_TYPES.warp]: { name: "Warp", function: runInWarp },
  [TERMINAL_TYPES.terminal]: { name: "Terminal", function: runInTerminal },
};
