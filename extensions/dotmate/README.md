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
│   ├── zsh/
│   │   ├── zshrc
│   │   └── zprofile
│   ├── git/
│   │   ├── config
│   │   └── ignore
│   ├── vim/
│   │   └── vimrc
│   ├── nvim/
│   │   └── init.lua
│   ├── tmux/
│   │   └── tmux.conf
│   ├── ghostty/
│   │   └── config
│   ├── vscode/
│   │   └── settings.json
│   ├── zed/
│   │   └── settings.json
│   ├── gdb/
│   │   └── gdbinit
│   └── ruff/
│       └── ruff.toml
└── ... (other files)
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

| Application  | Local Path                                              | Repository Path                           |
| ------------ | ------------------------------------------------------- | ----------------------------------------- |
| Zsh          | `~/.zshrc`, `~/.zprofile`                               | `config/zsh/zshrc`, `config/zsh/zprofile` |
| Git          | `~/.config/git/*`                                       | `config/git/*`                            |
| Neovim       | `~/.config/nvim/init.lua`                               | `config/nvim/init.lua`                    |
| Vim          | `~/.config/vim/vimrc`                                   | `config/vim/vimrc`                        |
| Tmux         | `~/.config/tmux/tmux.conf`                              | `config/tmux/tmux.conf`                   |
| Ghostty      | `~/.config/ghostty/config`                              | `config/ghostty/config`                   |
| VS Code      | `~/Library/Application Support/Code/User/settings.json` | `config/vscode/settings.json`             |
| Zed          | `~/.config/zed/settings.json`                           | `config/zed/settings.json`                |
| GDB          | `~/.config/gdb/gdbinit`                                 | `config/gdb/gdbinit`                      |
| Ruff         | `~/.config/ruff/ruff.toml`                              | `config/ruff/ruff.toml`                   |
| EditorConfig | `~/.editorconfig`                                       | `config/editorconfig`                     |

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
