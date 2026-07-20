# DotMate

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=150&section=header&text=&fontSize=50&fontColor=fff&animation=fadeIn" alt="Header Banner">
</p>

<p align="center">
  <img src="assets/dotmate.png" alt="DotMate Icon" width="100">
</p>

<p align="center">
  <strong>Powerful Raycast extension for dotfile management</strong>
</p>

---

A powerful Raycast extension for managing your dotfiles with ease. Keep your configuration files synchronized between your local machine and your dotfiles repository.

## Features

- **Dotmate**: List and run all available commands
- **Backup Configs**: Backup your local configuration files to your dotfiles repository
- **Restore Configs**: Restore configuration files from your repository to your local machine
- **Show Status**: Check the synchronization status of your dotfiles
- **Show Diffs**: View differences between local and repository configurations

## Installation

1. Install the extension from the Raycast Store or clone this repository
2. Open Raycast preferences and navigate to Extensions → DotMate
3. Set the **Dotfile Repository Path** to point to your dotfiles repository

## Setup

### Repository Structure

DotMate expects your dotfiles repository to have a specific structure:

```text
your-dotfiles-repo/
├── config/
│   ├── shell/
│   │   ├── aliases
│   │   ├── env
│   │   ├── exports
│   │   ├── functions
│   │   ├── inputrc
│   │   └── path
│   ├── zsh/
│   │   ├── zlogin
│   │   ├── zlogout
│   │   ├── zprofile
│   │   ├── zshenv
│   │   ├── zshrc
│   │   └── p10k.zsh
│   ├── bash/
│   │   ├── bash_login
│   │   ├── bash_logout
│   │   ├── bash_profile
│   │   ├── bashrc
│   │   └── profile
│   ├── fish/
│   │   └── config.fish
│   ├── starship/
│   │   └── starship.toml
│   ├── git/
│   │   ├── attributes
│   │   ├── config
│   │   ├── gh-config.yml
│   │   ├── glab-config.yml
│   │   ├── gitconfig
│   │   ├── gitignore
│   │   └── gitignore_global
│   ├── vim/
│   │   └── vimrc
│   ├── nvim/
│   │   └── init.lua
│   ├── emacs/
│   │   ├── emacs
│   │   └── init.el
│   ├── vscode/
│   │   ├── keybindings.json
│   │   ├── mcp.json
│   │   ├── settings.json
│   │   └── vscode-extensions
│   ├── zed/
│   │   └── settings.json
│   ├── kitty/
│   │   └── kitty.conf
│   ├── alacritty/
│   │   └── alacritty.yml
│   ├── wezterm/
│   │   └── wezterm.lua
│   ├── ghostty/
│   │   └── config
│   ├── iterm2/
│   │   └── com.googlecode.iterm2.plist
│   ├── warp/
│   │   └── dev.warp.Warp-Stable.plist
│   ├── terminal/
│   │   └── com.apple.Terminal.plist
│   ├── tmux/
│   │   ├── tmux.conf
│   │   └── tmux.conf.xdg
│   ├── screen/
│   │   └── screenrc
│   ├── ruff/
│   │   └── ruff.toml
│   ├── python/
│   │   ├── flake8
│   │   └── pylintrc
│   ├── prettier/
│   │   ├── prettierignore
│   │   ├── prettierrc
│   │   └── prettierrc.json
│   ├── editor/
│   │   └── editorconfig
│   ├── clang/
│   │   └── clang-format
│   ├── rust/
│   │   ├── cargo-config.toml
│   │   └── rustfmt.toml
│   ├── eslint/
│   │   ├── eslintrc.js
│   │   ├── eslintrc.json
│   │   └── eslintignore
│   ├── stylelint/
│   │   ├── stylelintrc
│   │   ├── stylelintrc.json
│   │   └── stylelintignore
│   ├── shellcheck/
│   │   └── shellcheckrc
│   ├── bat/
│   │   └── config
│   ├── delta/
│   │   └── delta.toml
│   ├── tldr/
│   │   └── config.json
│   ├── fzf/
│   │   ├── fzf.bash
│   │   └── fzf.zsh
│   ├── ripgrep/
│   │   └── ripgreprc
│   ├── ignore/
│   │   ├── agignore
│   │   └── ignore
│   ├── net/
│   │   ├── curlrc
│   │   └── wgetrc
│   ├── asdf/
│   │   └── tool-versions
│   ├── sdkman/
│   │   └── config
│   ├── pyenv/
│   │   └── version
│   ├── rbenv/
│   │   └── version
│   ├── nodenv/
│   │   └── version
│   ├── swiftenv/
│   │   └── version
│   ├── ruby/
│   │   ├── gemrc
│   │   ├── irbrc
│   │   └── pryrc
│   ├── go/
│   │   └── env
│   ├── node/
│   │   ├── npmrc
│   │   ├── pnpmrc
│   │   ├── yarnrc
│   │   └── yarnrc.yml
│   ├── brew/
│   │   └── Brewfile
│   ├── ssh/
│   │   ├── config
│   │   └── known_hosts
│   └── gdb/
│       ├── gdbinit
│       └── gdbinit.xdg
└── ...
```

### Configuration

1. **Dotfile Repository Path**: The absolute path to your dotfiles repository
   - Example: `/Users/yourname/dotfiles`
   - This directory should contain a `config/` subdirectory where your dotfiles are stored

## Commands

### 🔄 Backup Configs

Backs up your local configuration files to your dotfiles repository.

**Usage**: Open Raycast → Type "Backup Configs" → Press Enter

**What it does**:

- Copies configuration files from their standard locations in your home directory to your dotfiles repository
- Skips files that don't exist locally
- Skips files that are already identical between local and repository
- Shows a summary of operations performed

### 📥 Restore Configs

Restores configuration files from your dotfiles repository to your local machine.

**Usage**: Open Raycast → Type "Restore Configs" → Press Enter

**What it does**:

- Copies configuration files from your dotfiles repository to their standard locations
- Creates necessary directories if they don't exist
- Skips files that don't exist in the repository
- Skips files that are already identical between repository and local
- Shows a summary of operations performed

### 🔍 Show Diffs

View differences between your local configuration files and those in your repository.

**Usage**: Open Raycast → Type "Show Diffs" → Press Enter

**What it shows**:

- Side-by-side comparison of local vs repository files
- Files that exist in only one location
- Visual highlighting of differences
- File modification times

### 📊 Show Status

Check the synchronization status of all your dotfiles.

**Usage**: Open Raycast → Type "Show Status" → Press Enter

**What it shows**:

- List of all managed dotfiles
- Synchronization status (identical, different, missing)
- File sizes and modification dates
- Quick overview of what needs attention

## Supported Configuration Files

DotMate currently manages these configuration files:

| Category | Application | Local Path | Repository Path |
|:---|:---|:---|:---|
| Shell | Generic includes | ~/.aliases, ~/.env, ~/.exports, ~/.functions, ~/.inputrc, ~/.path | config/shell/aliases, config/shell/env, config/shell/exports, config/shell/functions, config/shell/inputrc, config/shell/path |
| Shell | Zsh | ~/.zlogin, ~/.zlogout, ~/.zprofile, ~/.zshenv, ~/.zshrc, ~/.p10k.zsh | config/zsh/zlogin, config/zsh/zlogout, config/zsh/zprofile, config/zsh/zshenv, config/zsh/zshrc, config/zsh/p10k.zsh |
| Shell | Bash | ~/.bash_login, ~/.bash_logout, ~/.bash_profile, ~/.bashrc, ~/.profile | config/bash/bash_login, config/bash/bash_logout, config/bash/bash_profile, config/bash/bashrc, config/bash/profile |
| Shell | Fish | ~/.config/fish/config.fish | config/fish/config.fish |
| Prompts | Starship | ~/.config/starship.toml | config/starship/starship.toml |
| Git | Core | ~/.gitconfig, ~/.gitignore_global | config/git/gitconfig, config/git/gitignore_global |
| Git | XDG | ~/.config/git/config, ~/.config/git/attributes, ~/.config/git/ignore | config/git/config, config/git/attributes, config/git/ignore |
| Git | GitHub CLI | ~/.config/gh/config.yml | config/git/gh-config.yml |
| Git | GitLab CLI | ~/.config/glab-cli/config.yml | config/git/glab-config.yml |
| Editors | Vim | ~/.vimrc | config/vim/vimrc |
| Editors | Neovim | ~/.config/nvim/init.lua | config/nvim/init.lua |
| Editors | Emacs | ~/.emacs, ~/.emacs.d/init.el | config/emacs/emacs, config/emacs/init.el |
| Editors | VS Code (settings) | ~/Library/Application Support/Code/User/settings.json | config/vscode/settings.json |
| Editors | VS Code (keybindings) | ~/Library/Application Support/Code/User/keybindings.json | config/vscode/keybindings.json |
| Editors | VS Code (MCP) | ~/Library/Application Support/Code/User/mcp.json | config/vscode/mcp.json |
| Editors | VS Code (extensions list) | ~/.vscode/vscode-extensions | config/vscode/vscode-extensions |
| Editors | Zed | ~/.config/zed/settings.json | config/zed/settings.json |
| Terminals | Kitty | ~/.config/kitty/kitty.conf | config/kitty/kitty.conf |
| Terminals | Alacritty | ~/.config/alacritty/alacritty.yml | config/alacritty/alacritty.yml |
| Terminals | WezTerm | ~/.wezterm.lua | config/wezterm/wezterm.lua |
| Terminals | Ghostty | ~/.config/ghostty/config | config/ghostty/config |
| Terminals | iTerm2 | ~/Library/Preferences/com.googlecode.iterm2.plist | config/iterm2/com.googlecode.iterm2.plist |
| Terminals | Warp | ~/Library/Preferences/dev.warp.Warp-Stable.plist | config/warp/dev.warp.Warp-Stable.plist |
| Terminals | Terminal.app | ~/Library/Preferences/com.apple.Terminal.plist | config/terminal/com.apple.Terminal.plist |
| Multiplexers | Tmux | ~/.tmux.conf, ~/.config/tmux/tmux.conf | config/tmux/tmux.conf, config/tmux/tmux.conf.xdg |
| Multiplexers | Screen | ~/.screenrc | config/screen/screenrc |
| Linters/Formatters | Ruff | ~/.config/ruff/ruff.toml | config/ruff/ruff.toml |
| Linters/Formatters | Python | ~/.pylintrc, ~/.flake8 | config/python/pylintrc, config/python/flake8 |
| Linters/Formatters | Prettier | ~/.prettierrc, ~/.prettierrc.json, ~/.prettierignore | config/prettier/prettierrc, config/prettier/prettierrc.json, config/prettier/prettierignore |
| Linters/Formatters | EditorConfig | ~/.editorconfig | config/editor/editorconfig |
| Linters/Formatters | Clang-Format | ~/.clang-format | config/clang/clang-format |
| Linters/Formatters | Rustfmt | ~/.rustfmt.toml | config/rust/rustfmt.toml |
| Linters/Formatters | ESLint | ~/.eslintrc.js, ~/.eslintrc.json, ~/.eslintignore | config/eslint/eslintrc.js, config/eslint/eslintrc.json, config/eslint/eslintignore |
| Linters/Formatters | Stylelint | ~/.stylelintrc, ~/.stylelintrc.json, ~/.stylelintignore | config/stylelint/stylelintrc, config/stylelint/stylelintrc.json, config/stylelint/stylelintignore |
| Linters/Formatters | ShellCheck | ~/.shellcheckrc | config/shellcheck/shellcheckrc |
| CLI Tools | bat | ~/.config/bat/config | config/bat/config |
| CLI Tools | delta | ~/.config/delta/delta.toml | config/delta/delta.toml |
| CLI Tools | tldr | ~/.config/tldr/config.json | config/tldr/config.json |
| CLI Tools | fzf | ~/.fzf.bash, ~/.fzf.zsh | config/fzf/fzf.bash, config/fzf/fzf.zsh |
| CLI Tools | ripgrep | ~/.ripgreprc | config/ripgrep/ripgreprc |
| CLI Tools | ignore files | ~/.agignore, ~/.ignore | config/ignore/agignore, config/ignore/ignore |
| CLI Tools | curl, wget | ~/.curlrc, ~/.wgetrc | config/net/curlrc, config/net/wgetrc |
| Env Managers | asdf | ~/.tool-versions | config/asdf/tool-versions |
| Env Managers | SDKMAN! | ~/.sdkman/etc/config | config/sdkman/config |
| Env Managers | pyenv | ~/.pyenv/version | config/pyenv/version |
| Env Managers | rbenv | ~/.rbenv/version | config/rbenv/version |
| Env Managers | nodenv | ~/.nodenv/version | config/nodenv/version |
| Env Managers | swiftenv | ~/.swiftenv/shims/.version | config/swiftenv/version |
| Language Tooling | Ruby | ~/.gemrc, ~/.irbrc, ~/.pryrc | config/ruby/gemrc, config/ruby/irbrc, config/ruby/pryrc |
| Language Tooling | Rust | ~/.cargo/config.toml | config/rust/cargo-config.toml |
| Language Tooling | Go | ~/.config/go/env | config/go/env |
| Package Managers | npm | ~/.npmrc | config/node/npmrc |
| Package Managers | pnpm | ~/.config/pnpm/rc | config/node/pnpmrc |
| Package Managers | yarn | ~/.yarnrc, ~/.yarnrc.yml | config/node/yarnrc, config/node/yarnrc.yml |
| Package Managers | RubyGems | ~/.gemrc | config/ruby/gemrc |
| Package Managers | Homebrew | ~/Brewfile | config/brew/Brewfile |
| SSH | OpenSSH | ~/.ssh/config, ~/.ssh/known_hosts | config/ssh/config, config/ssh/known_hosts |
| Debuggers | GDB | ~/.gdbinit, ~/.config/gdb/gdbinit | config/gdb/gdbinit, config/gdb/gdbinit.xdg |

Notes:
-  Some files (e.g., GitHub/GitLab CLI, known_hosts) can contain sensitive information. Back them up only if you’re comfortable and your repo is private.
-  VS Code extensions list is captured via a plain text export at ~/.vscode/vscode-extensions. Consider regenerating it periodically with: `code --list-extensions > ~/.vscode/vscode-extensions`.
-  Homebrew’s Brewfile is generated via `brew bundle dump --file=~/Brewfile --force`.

## Tips

### Best Practices

1. **Version Control**: Keep your dotfiles repository under version control (Git)
2. **Backup First**: Always backup your existing configurations before first use
3. **Regular Sync**: Use "Show Status" regularly to keep track of changes
4. **Review Diffs**: Use "Diff Configs" before collecting or deploying to review changes

### Troubleshooting

- **Permission Errors**: Ensure you have read/write permissions to both your home directory and dotfiles repository
- **Missing Files**: Some configuration files might not exist initially - DotMate will skip them gracefully
- **Path Issues**: Double-check that your repository path is correct and contains a `config/` directory

### Workflow Example

1. Make changes to your local configuration files
2. Run **Show Status** to see what's changed
3. Run **Show Diffs** to review the differences
4. Run **Backup Configs** to backup changes to your repository
5. Commit and push changes to your version control system

When setting up a new machine:

1. Clone your dotfiles repository
2. Configure DotMate with the repository path
3. Run **Restore Configs** to restore all your configurations

## License

MIT

## Contributing

Issues and pull requests are welcome! Please feel free to contribute to make DotMate even better.
