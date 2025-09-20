# Changelog

## [1.0.0] - 2024-01-19

### Initial Release

#### Features
- 🚀 **Universal File Search**: Search ALL files on your Mac using `fd` - finds files that Spotlight can't index
- 🎯 **Smart Search Modes**:
  - Regex mode (default) - Powerful pattern matching with regular expressions
  - Glob mode - Simple wildcard patterns like `*.txt` or `nginx.*`
- 📁 **Flexible Search Scopes**:
  - Home Directory
  - All System (/)
  - Downloads, Documents, Applications
  - System Config Files (/etc, /opt)
  - Custom paths you define
- ⚡ **Manual Trigger Performance**: Search only triggers when you press Enter for optimal performance
- 🎨 **Smart File Actions**: Intelligent app recommendations based on file types
- ⌨️ **Keyboard Shortcuts**:
  - `Enter`: Trigger search (when no results) or open file (when results exist)
  - `Cmd+S`: Search again (when results exist)
  - `Cmd+M`: Toggle between Regex and Glob modes
  - `Cmd+C`: Copy file path
  - `Cmd+R`: Reveal in Finder
  - `Space`: Quick Look preview

#### Technical Details
- Built with TypeScript and React
- Uses `fd` (fast alternative to `find`) for file searching
- Searches with `--no-ignore` flag to find files in .gitignored directories
- Smart handling of Homebrew and system directories
- Optimized for performance with manual search triggering

#### Configuration Options
- Max Search Depth (default: 20)
- Show Hidden Files toggle
- Exclude Patterns (customize folders to skip)
- Custom Search Paths (add your frequently searched directories)
- Default Search Scope (choose your preferred starting location)
- Default Search Mode (Regex or Glob)

#### Requirements
- macOS
- Raycast
- `fd` command-line tool (extension guides through installation if not present)