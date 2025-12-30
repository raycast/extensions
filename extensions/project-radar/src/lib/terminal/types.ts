// ============================================
// Terminal Executor Types
// ============================================

/** Parameters for terminal execution */
export interface TerminalExecuteParams {
  /** Path to open in terminal */
  path: string;
  /** Terminal application bundle ID */
  bundleId: string;
  /** Optional command to run after opening */
  command?: string;
}

/** Terminal executor interface */
export interface TerminalExecutor {
  execute(params: TerminalExecuteParams): Promise<void>;
}

/** Supported terminal types with command execution */
export type TerminalType =
  | "terminal.app"
  | "iterm2"
  | "kitty"
  | "alacritty"
  | "ghostty"
  | "wezterm"
  | "warp"
  | "generic";
