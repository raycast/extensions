export const STORAGE_KEY = "recentProjectPaths";
export const TERMINAL_STORAGE_KEY = "selectedTerminal";
export const MAX_RECENT_PATHS = 10;

export const AGENTS = [
  { title: "Claude", value: "claude" },
  { title: "Gemini", value: "gemini" },
  { title: "Codex", value: "codex" },
];

export const KNOWN_TERMINALS = [
  { title: "Terminal", bundleId: "com.apple.Terminal", value: "terminal" },
  { title: "iTerm2", bundleId: "com.googlecode.iterm2", value: "iterm2" },
  { title: "Warp", bundleId: "dev.warp.Warp-Stable", value: "warp" },
  { title: "Alacritty", bundleId: "org.alacritty", value: "alacritty" },
  { title: "Kitty", bundleId: "net.kovidgoyal.kitty", value: "kitty" },
  { title: "WezTerm", bundleId: "com.github.wez.wezterm", value: "wezterm" },
  { title: "Ghostty", bundleId: "com.mitchellh.ghostty", value: "ghostty" },
];
