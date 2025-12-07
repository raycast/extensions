<p align="center">
<img width=180 src="https://user-images.githubusercontent.com/67844154/164725204-544131bd-60e4-4666-8541-6587f20d7e42.png">
</p>

# Obsidian Multi-Vault for Raycast

An enhanced Raycast extension for [Obsidian](https://obsidian.md/) with comprehensive multi-vault support, Windows compatibility, and performance optimizations for large vaults.

> **This is a fork of [obsidian-raycast](https://github.com/marcjulianschwarz/obsidian-raycast)** by Marc Julian Schwarz and Kevin Batdorf. This fork focuses on multi-vault workflows, Windows support, and handling large vaults (1000+ notes) without memory issues.

## Installation

```bash
git clone https://github.com/josh-stephens/obsidian-multivault.git
cd obsidian-multivault
npm install
npm run build
```

The extension will then appear in Raycast.

## Key Features

### Multi-Vault Support
- **Vault Management** - Customize display names, emojis, abbreviations, and colors for each vault
- **Favorites & Active Vault** - Mark vaults as favorites and set an active vault for quick access
- **Smart Vault Selection** - Skip vault picker and go directly to your active vault (`Cmd+Shift+V` to switch)
- **Recent Notes Across Vaults** - View recently modified notes from all vaults in one unified view
- **Cross-Vault Search** - Search notes across all vaults simultaneously
- **Vault Indicators** - Visual badges showing which vault each note belongs to

### Windows & Cross-Platform
- Raycast Windows beta compatibility (`raycast-x` config path)
- Cross-platform Obsidian config detection (Windows/macOS/Linux)
- Proper handling of quoted vault paths

### Performance (Large Vaults)
- **Lazy loading** - Notes load metadata only; content loaded on demand
- **Memory optimized** - Handles vaults with 1000+ notes without crashing
- **Fast tag extraction** - Reads only first 2KB of files for YAML frontmatter
- **Two-phase search** - Title/path search first, content search only when needed

### Enhanced Rendering
- **Image attachments** - Obsidian `![[image.jpg]]` syntax supported (external URLs render; local images show placeholders due to Raycast limitations)
- **Excalidraw support** - Drawing files show friendly message instead of raw JSON

## Commands

### New Commands (This Fork)
| Command | Description |
|---------|-------------|
| **Manage Vaults** | Configure vault settings, favorites, display names, and active vault |
| **Switch Active Vault** | Quick switcher for changing the active vault |
| **Recent Notes** | Browse recently modified notes across all vaults with time filters |

### Original Commands
| Command | Description |
|---------|-------------|
| **Search Note** | Search notes by title or content, with tag filtering |
| **Search Media** | Find images, videos, audio, and PDFs in your vaults |
| **Create Note** | Create new notes with templates and tag support |
| **Daily Note** | Open or create today's daily note |
| **Append to Daily Note** | Quickly append text to your daily note |
| **Bookmarked Notes** | Access your bookmarked/starred notes |
| **Random Note** | Open a random note for serendipitous discovery |
| **Open Vault** | Open a vault in Obsidian |
| **Menu Bar** | Quick access to vaults and bookmarks from the menu bar |

## Configuration

Access preferences in Raycast Settings > Extensions > Obsidian Multi-Vault:

### Multi-Vault Settings
- **Skip Vault Selection** - Go directly to active vault; use `Cmd+Shift+V` to switch
- **Show Vault Indicators** - Display vault badges in search results
- **Vault Indicator Style** - Badge, subtitle, or both
- **Cross-Vault Search** - Search all vaults at once

### General Settings
- **Vault Paths** - Comma-separated paths (or auto-detect from Obsidian)
- **Excluded Folders** - Folders to hide from search
- **Hide YAML/LaTeX/Wikilinks** - Clean up note display

### Command-Specific Settings
Each command has its own preferences for templates, primary actions, and display options. See the command settings in Raycast for details.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Primary action (configurable: Quick Look, Open in Obsidian, etc.) |
| `Cmd+Enter` | Open in Obsidian |
| `Cmd+Shift+V` | Switch active vault |
| `Opt+E` | Edit note |
| `Opt+D` | Delete note |
| `Opt+A` | Append text to note |
| `Opt+C` | Copy note content |
| `Opt+L` | Copy markdown link |
| `Opt+U` | Copy Obsidian URI |
| `Opt+P` | Toggle bookmark |

## Requirements

- [Raycast](https://raycast.com/) (macOS or Windows beta)
- [Obsidian](https://obsidian.md/)
- For Daily Note features: [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) plugin

## Credits

### This Fork
- **[Josh Stephens](https://github.com/josh-stephens)** - Windows support, lazy loading, multi-vault features, performance optimizations
- **Claude (Opus 4.5)** by [Anthropic](https://anthropic.com) - AI pair programming

### Original Extension
This fork is based on [obsidian-raycast](https://github.com/marcjulianschwarz/obsidian-raycast):
- **[Marc Julian Schwarz](https://marc-julian.de/)** - Original creator
- **[Kevin Batdorf](https://github.com/KevinBatdorf/)** - Previous maintainer
- And all the [original contributors](https://github.com/marcjulianschwarz/obsidian-raycast/graphs/contributors)

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Disclaimer

This project is not affiliated with Obsidian. "Obsidian" is a registered trademark of Obsidian MD.
