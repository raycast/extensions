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
  // shell
  createDotFile(".zshrc", "zsh/zshrc"),
  createDotFile(".zprofile", "zsh/zprofile"),
  // git
  createDotFile(".config/git/config", "git/config"),
  createDotFile(".config/git/ignore", "git/ignore"),
  createDotFile(".config/git/gh-config", "git/gh-config"),
  createDotFile(".config/git/gl-config", "git/gl-config"),
  // editor
  createDotFile(".editorconfig", "editorconfig"),
  // tmux
  createDotFile(".config/tmux/tmux.conf", "tmux/tmux.conf"),
  // neovim
  createDotFile(".config/nvim/init.lua", "nvim/init.lua"),
  // vim
  createDotFile(".config/vim/vimrc", "vim/vimrc"),
  // gdb
  createDotFile(".config/gdb/gdbinit", "gdb/gdbinit"),
  // ghostty
  createDotFile(".config/ghostty/config", "ghostty/config"),
  // vscode
  createDotFile(
    "Library/Application Support/Code/User/settings.json",
    "vscode/settings.json",
  ),
  // zed
  createDotFile(".config/zed/settings.json", "zed/settings.json"),
  // ruff
  createDotFile(".config/ruff/ruff.toml", "ruff/ruff.toml"),
];
