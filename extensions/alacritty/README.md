# Alacritty

Adds commands to control the Alacritty terminal emulator.

## Commands

### Edit File in Alacritty

Edits the currently selected Finder item(s) in a new Alacritty window using `$EDITOR`.

- If `$EDITOR` is unset, the command falls back to `/usr/bin/vim`.
- Selected items are passed to the editor using the following format: `$EDITOR '/path/to/file1' '/path/to/file2'`.
- If you're using Vim, each item is added to the arglist, which you can navigate using `:next` and `:prev`.

### Open Folder in Alacritty

Opens a new Alacritty window at the currently selected directory (or the parent directory of the current file if a file is selected).

- Multiple selections will open a new Alacritty window at each selection.

### Run Command from Clipboard

Runs the current clipboard content as a shell command in Alacritty. **Use at your own risk!**

- Shell commands can do very bad things, including permanently deleting files and accessing sensitive data. Make sure you've carefully reviewed any command before running it.

### Run Command from Selection

Runs the currently selected text as a shell command in Alacritty. **Use at your own risk!**

- See the precautions above.

### Change Theme

Search and switch to alacritty's themes that are available in the [alacritty-theme](https://github.com/alacritty/alacritty-theme) github repo. The theme file will be downloaded to the `/themes` folder of where your config is located & the import section will be added/updated in your alacritty's config file to switch the theme.

## Configuration

### Alacritty Path

Full path to the Alacritty executable. Defaults to `/Applications/Alacritty.app/Contents/MacOS/alacritty`.

### Shell Path

Full path to the shell executable used to run commands. Defaults to `/bin/zsh`.

- To use your preferred shell, set this to the output of `echo $SHELL`.

- The plugin currently supports `zsh`, `bash`, and `sh` (tested against the versions included with macOS Ventura) and `fish` (tested against the latest version from Homebrew).

### Config Fle Path
Path to alacritty's config file (Default: `~/.config/alacritty/alacritty.toml`). Theme files will be placed in `/themes` directory of where this file is located.

## License

The plugin is licensed under the MIT license.

The extension's icon is borrowed from [Alacritty](https://github.com/alacritty/alacritty), which is licensed under the [Apache License 2.0](https://github.com/alacritty/alacritty/blob/master/LICENSE-APACHE).
