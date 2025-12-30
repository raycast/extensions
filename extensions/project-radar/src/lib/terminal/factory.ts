import { TerminalExecutor, TerminalType } from "./types";
import {
  TerminalAppExecutor,
  ITerm2Executor,
  KittyExecutor,
  AlacrittyExecutor,
  GhosttyExecutor,
  WezTermExecutor,
  WarpExecutor,
  GenericExecutor,
} from "./executors";

// ============================================
// Terminal Executor Factory
// ============================================

/** Bundle ID to terminal type mapping */
const BUNDLE_ID_TO_TYPE: Record<string, TerminalType> = {
  "com.apple.Terminal": "terminal.app",
  "com.googlecode.iterm2": "iterm2",
  "net.kovidgoyal.kitty": "kitty",
  "io.alacritty": "alacritty",
  "com.mitchellh.ghostty": "ghostty",
  "com.github.wez.wezterm": "wezterm",
  "dev.warp.Warp-Stable": "warp",
};

/**
 * Creates a terminal executor based on the bundle ID.
 * Returns a specialized executor for known terminals,
 * or a generic executor for unknown terminals.
 */
export function createTerminalExecutor(bundleId: string): TerminalExecutor {
  const type = BUNDLE_ID_TO_TYPE[bundleId] ?? "generic";

  switch (type) {
    case "terminal.app":
      return new TerminalAppExecutor();
    case "iterm2":
      return new ITerm2Executor();
    case "kitty":
      return new KittyExecutor();
    case "alacritty":
      return new AlacrittyExecutor();
    case "ghostty":
      return new GhosttyExecutor();
    case "wezterm":
      return new WezTermExecutor();
    case "warp":
      return new WarpExecutor();
    default:
      return new GenericExecutor();
  }
}
