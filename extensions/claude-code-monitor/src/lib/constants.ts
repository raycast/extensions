import { Color, Icon } from "@raycast/api";
import { SessionState } from "../types";

export const STATE_CONFIG: Record<
  SessionState,
  { icon: Icon; color: Color; label: string }
> = {
  active: { icon: Icon.CircleFilled, color: Color.Green, label: "Active" },
  waiting: {
    icon: Icon.ExclamationMark,
    color: Color.Orange,
    label: "Waiting",
  },
  idle: { icon: Icon.Circle, color: Color.Yellow, label: "Idle" },
  ended: {
    icon: Icon.CircleDisabled,
    color: Color.SecondaryText,
    label: "Ended",
  },
};

export const DEFAULT_STATE_CONFIG = {
  icon: Icon.QuestionMarkCircle,
  color: Color.SecondaryText,
  label: "Unknown",
};

// Bundle ID → resolved identifier (used for detection)
const JETBRAINS_BUNDLE_MAP: Record<string, string> = {
  "com.jetbrains.intellij": "jetbrains-idea",
  "com.jetbrains.intellij.ce": "jetbrains-idea",
  "com.jetbrains.WebStorm": "jetbrains-webstorm",
  "com.jetbrains.pycharm": "jetbrains-pycharm",
  "com.jetbrains.pycharm.ce": "jetbrains-pycharm",
  "com.jetbrains.goland": "jetbrains-goland",
  "com.jetbrains.CLion": "jetbrains-clion",
  "com.jetbrains.PhpStorm": "jetbrains-phpstorm",
  "com.jetbrains.rubymine": "jetbrains-rubymine",
  "com.jetbrains.rider": "jetbrains-rider",
  "com.jetbrains.datagrip": "jetbrains-datagrip",
  "com.google.android.studio": "jetbrains-studio",
};

// Resolved ID → bundle ID for `open -b` fallback (derived from JETBRAINS_BUNDLE_MAP)
export const JETBRAINS_FALLBACK_BUNDLES: Record<string, string> =
  Object.fromEntries(
    Object.entries(JETBRAINS_BUNDLE_MAP).map(([bundle, id]) => [id, bundle]),
  );

// App display names
export const APP_LABELS: Record<string, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
  zed: "Zed",
  windsurf: "Windsurf",
  Apple_Terminal: "Terminal",
  "iTerm.app": "iTerm2",
  WarpTerminal: "Warp",
  ghostty: "Ghostty",
  kitty: "kitty",
  tmux: "tmux",
  jetbrains: "JetBrains",
  "jetbrains-idea": "IntelliJ IDEA",
  "jetbrains-webstorm": "WebStorm",
  "jetbrains-pycharm": "PyCharm",
  "jetbrains-goland": "GoLand",
  "jetbrains-clion": "CLion",
  "jetbrains-phpstorm": "PhpStorm",
  "jetbrains-rubymine": "RubyMine",
  "jetbrains-rider": "Rider",
  "jetbrains-datagrip": "DataGrip",
  "jetbrains-studio": "Android Studio",
};

/**
 * Resolve term_program considering JetBrains TERMINAL_EMULATOR.
 * JetBrains IDEs don't set TERM_PROGRAM — they set TERMINAL_EMULATOR=JetBrains-JediTerm.
 */
export function resolveTermProgram(
  termProgram?: string,
  terminalEmulator?: string,
  bundleId?: string,
): string {
  if (terminalEmulator === "JetBrains-JediTerm") {
    if (bundleId && JETBRAINS_BUNDLE_MAP[bundleId]) {
      return JETBRAINS_BUNDLE_MAP[bundleId];
    }
    return "jetbrains";
  }
  return termProgram || "";
}

export function getAppLabel(
  termProgram?: string,
  terminalEmulator?: string,
  bundleId?: string,
): string {
  const resolved = resolveTermProgram(termProgram, terminalEmulator, bundleId);
  return APP_LABELS[resolved] || resolved || "";
}

// 会话标题获取辅助函数
export function getSessionTitle(session: {
  project_name?: string;
  session_id: string;
}): string {
  return session.project_name || session.session_id.slice(0, 12) || "Unknown";
}
