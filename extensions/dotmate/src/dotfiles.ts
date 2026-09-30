import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export interface DotFile {
  homeRelative: string;
  repoRelative: string;
  homePath: string;
  repoPath: string;
  name: string;
}

interface Preferences {
  repoPath: string;
}

const preferences = getPreferenceValues<Preferences>();
const HOME_DIR = homedir();
const REPO_DIR = preferences.repoPath;
const CONFIG_DIR = REPO_DIR ? join(REPO_DIR, "config") : "";

export function validatePreferences(): void {
  if (!preferences.repoPath) {
    throw new Error("Please set the repoPath in preferences");
  }
}

function createDotFile(homeRelative: string, repoRelative: string): DotFile {
  return {
    homeRelative,
    repoRelative,
    homePath: join(HOME_DIR, homeRelative),
    repoPath: join(CONFIG_DIR, repoRelative),
    name: repoRelative.split("/").pop() || repoRelative,
  };
}

export const DOTFILES: DotFile[] = [
  // ========== Shell ==========
  createDotFile(".aliases", "shell/aliases"),
  createDotFile(".exports", "shell/exports"),
  createDotFile(".functions", "shell/functions"),
  createDotFile(".path", "shell/path"),
  createDotFile(".env", "shell/env"),
  createDotFile(".inputrc", "shell/inputrc"),

  // ========== Zsh ==========
  createDotFile(".zshrc", "zsh/zshrc"),
  createDotFile(".zprofile", "zsh/zprofile"),
  createDotFile(".zshenv", "zsh/zshenv"),
  createDotFile(".zlogin", "zsh/zlogin"),
  createDotFile(".zlogout", "zsh/zlogout"),

  // ========== Bash ==========
  createDotFile(".bashrc", "bash/bashrc"),
  createDotFile(".bash_profile", "bash/bash_profile"),
  createDotFile(".bash_login", "bash/bash_login"),
  createDotFile(".bash_logout", "bash/bash_logout"),
  createDotFile(".profile", "bash/profile"),

  // ========== Fish ==========
  createDotFile(".config/fish/config.fish", "fish/config.fish"),

  // ========== Prompts & Terminal tools ==========
  createDotFile(".config/starship.toml", "starship/starship.toml"),
  createDotFile(".p10k.zsh", "zsh/p10k.zsh"),

  // ========== Git ==========
  createDotFile(".gitconfig", "git/gitconfig"),
  createDotFile(".gitignore_global", "git/gitignore_global"),
  createDotFile(".config/git/config", "git/config"),
  createDotFile(".config/git/attributes", "git/attributes"),
  createDotFile(".config/git/ignore", "git/ignore"),
  createDotFile(".config/gh/config.yml", "git/gh-config.yml"),
  createDotFile(".config/glab-cli/config.yml", "git/glab-config.yml"),

  // ========== Editors ==========
  // Vim/Neovim
  createDotFile(".vimrc", "vim/vimrc"),
  createDotFile(".config/nvim/init.lua", "nvim/init.lua"),
  // Emacs
  createDotFile(".emacs", "emacs/emacs"),
  createDotFile(".emacs.d/init.el", "emacs/init.el"),
  // VS Code
  createDotFile(
    "Library/Application Support/Code/User/settings.json",
    "vscode/settings.json",
  ),
  createDotFile(
    "Library/Application Support/Code/User/keybindings.json",
    "vscode/keybindings.json",
  ),
  createDotFile(
    "Library/Application Support/Code/User/mcp.json",
    "vscode/mcp.json",
  ),
  createDotFile(".vscode/vscode-extensions", "vscode/vscode-extensions"), // via 'code --list-extensions > vscode-extensions'
  // Zed
  createDotFile(".config/zed/settings.json", "zed/settings.json"),

  // ========== Terminal emulators ==========
  // Kitty
  createDotFile(".config/kitty/kitty.conf", "kitty/kitty.conf"),
  // Alacritty
  createDotFile(".config/alacritty/alacritty.yml", "alacritty/alacritty.yml"),
  // WezTerm
  createDotFile(".wezterm.lua", "wezterm/wezterm.lua"),
  // Ghostty
  createDotFile(".config/ghostty/config", "ghostty/config"),
  // iTerm2
  createDotFile(
    "Library/Preferences/com.googlecode.iterm2.plist",
    "iterm2/com.googlecode.iterm2.plist",
  ),
  // Warp
  createDotFile(
    "Library/Preferences/dev.warp.Warp-Stable.plist",
    "warp/dev.warp.Warp-Stable.plist",
  ),
  // Terminal.app
  createDotFile(
    "Library/Preferences/com.apple.Terminal.plist",
    "terminal/com.apple.Terminal.plist",
  ),

  // ========== Multiplexers ==========
  // Tmux
  createDotFile(".tmux.conf", "tmux/tmux.conf"),
  createDotFile(".config/tmux/tmux.conf", "tmux/tmux.conf.xdg"),
  // Screen
  createDotFile(".screenrc", "screen/screenrc"),

  // ========== Linters/Formatters ==========
  createDotFile(".config/ruff/ruff.toml", "ruff/ruff.toml"),
  createDotFile(".pylintrc", "python/pylintrc"),
  createDotFile(".flake8", "python/flake8"),
  createDotFile(".prettierrc", "prettier/prettierrc"),
  createDotFile(".prettierrc.json", "prettier/prettierrc.json"),
  createDotFile(".prettierignore", "prettier/prettierignore"),
  createDotFile(".editorconfig", "editor/editorconfig"),
  createDotFile(".clang-format", "clang/clang-format"),
  createDotFile(".rustfmt.toml", "rust/rustfmt.toml"),
  createDotFile(".eslintrc.json", "eslint/eslintrc.json"),
  createDotFile(".eslintrc.js", "eslint/eslintrc.js"),
  createDotFile(".eslintignore", "eslint/eslintignore"),
  createDotFile(".stylelintrc.json", "stylelint/stylelintrc.json"),
  createDotFile(".stylelintrc", "stylelint/stylelintrc"),
  createDotFile(".stylelintignore", "stylelint/stylelintignore"),
  createDotFile(".shellcheckrc", "shellcheck/shellcheckrc"),

  // ========== CLI Tools ==========
  createDotFile(".config/bat/config", "bat/config"),
  createDotFile(".config/delta/delta.toml", "delta/delta.toml"),
  createDotFile(".config/tldr/config.json", "tldr/config.json"),
  createDotFile(".fzf.zsh", "fzf/fzf.zsh"),
  createDotFile(".fzf.bash", "fzf/fzf.bash"),
  createDotFile(".ripgreprc", "ripgrep/ripgreprc"),
  createDotFile(".agignore", "ignore/agignore"),
  createDotFile(".ignore", "ignore/ignore"),
  createDotFile(".curlrc", "net/curlrc"),
  createDotFile(".wgetrc", "net/wgetrc"),

  // ========== Language env managers ==========
  createDotFile(".tool-versions", "asdf/tool-versions"),
  createDotFile(".sdkman/etc/config", "sdkman/config"),
  createDotFile(".pyenv/version", "pyenv/version"),
  createDotFile(".rbenv/version", "rbenv/version"),
  createDotFile(".nodenv/version", "nodenv/version"),
  createDotFile(".swiftenv/shims/.version", "swiftenv/version"),
  createDotFile(".irbrc", "ruby/irbrc"),
  createDotFile(".pryrc", "ruby/pryrc"),
  createDotFile(".cargo/config.toml", "rust/cargo-config.toml"),
  createDotFile(".config/go/env", "go/env"),

  // ========== Package Managers ==========
  createDotFile(".npmrc", "node/npmrc"),
  createDotFile(".yarnrc", "node/yarnrc"),
  createDotFile(".yarnrc.yml", "node/yarnrc.yml"),
  createDotFile(".config/pnpm/rc", "node/pnpmrc"),
  createDotFile(".gemrc", "ruby/gemrc"),
  createDotFile("Brewfile", "brew/Brewfile"), // via 'brew bundle dump'

  // ========== SSH ==========
  createDotFile(".ssh/config", "ssh/config"),
  createDotFile(".ssh/known_hosts", "ssh/known_hosts"),

  // ========== Debuggers ==========
  createDotFile(".gdbinit", "gdb/gdbinit"),
  createDotFile(".config/gdb/gdbinit", "gdb/gdbinit.xdg"),
];
