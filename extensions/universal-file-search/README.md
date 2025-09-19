# Universal File Search for Raycast

🔍 **Search ALL files on your Mac** - including hidden configs, system files, and everything Spotlight misses!

## Features

- 🚀 **Universal Search**: Uses `fd` to search your entire filesystem, finding files that Spotlight can't index
- 🎯 **Smart Search Modes**:
  - **Regex Mode** (default): Powerful pattern matching with regular expressions
  - **Glob Mode**: Simple wildcard patterns like `*.txt` or `nginx.*`
- 📁 **Flexible Search Scopes**:
  - Home Directory
  - All System (/)
  - Downloads, Documents, Applications
  - System Config Files (/etc, /opt)
  - Custom paths you define
- ⚡ **Manual Trigger**: Designed for performance - search only triggers when you press Enter
- 🎨 **Smart File Actions**: Intelligent app recommendations based on file types
- ⌨️ **Keyboard Shortcuts**:
  - `Enter`: Trigger search (when no results) or open file (when results exist)
  - `Cmd+S`: Search again (when results exist)
  - `Cmd+M`: Toggle between Regex and Glob modes
  - `Cmd+C`: Copy file path
  - `Cmd+R`: Reveal in Finder
  - `Space`: Quick Look preview

## Prerequisites

This extension requires `fd` - a fast alternative to `find` command.

### Installing fd

The extension will guide you through installation if `fd` is not found. You can also install manually:

```bash
brew install fd
```

If you don't have Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install fd
```

## Configuration

### Custom Search Paths
Add your frequently searched directories in preferences:
- Format: `Name1:/path1,Name2:/path2`
- Example: `Homebrew:/opt/homebrew,Projects:/Users/me/Projects`

### Search Modes
- **Regex Mode**: fd's default - uses regular expressions
  - Example: `nginx\.conf$` finds files ending with nginx.conf
- **Glob Mode**: Simple wildcards
  - Example: `nginx.conf` automatically becomes `*nginx.conf*` to match nginx.conf.backup

### Performance Settings
- **Max Search Depth**: Limit directory traversal depth (default: 20)
- **Show Hidden Files**: Include dotfiles in results
- **Exclude Patterns**: Skip specified folders (default: .git, node_modules, etc.)

## Why Universal File Search?

macOS Spotlight is great for indexed files, but it misses:
- System configuration files
- Hidden dotfiles
- Files in /opt, /etc, /usr/local
- Non-indexed locations
- Files with unusual extensions

This extension uses `fd` to search EVERYTHING on your system - no file is hidden!

## Tips

1. **For config files**: Use "Config Files" scope to search /etc and /opt
2. **For Homebrew files**: Add `/opt/homebrew` as a custom path
3. **Use Regex mode** for precise searches with special characters
4. **Use Glob mode** for simple wildcard searches
5. **Press Cmd+M** to quickly toggle between search modes

## License

MIT

## Author

Created with ❤️ for the Raycast community