# Obsidian Link Opener

Use your Obsidian vault into a bookmark manager. This extension lets you quickly access URLs stored in your notes' frontmatter, treating your knowledge base as a structured collection of bookmarks organized by project, topic, or any system you prefer.

<div align="center">
  <img src="metadata/obsidian-link-opener-1.png" alt="Screenshot 1" width="45%" style="margin-right: 5%">
  <img src="metadata/obsidian-link-opener-2.png" alt="Screenshot 2" width="45%">
</div>

## Why Use Obsidian as a Bookmark Manager?

- **Contextual Organization**: Keep URLs alongside your project notes, research, and documentation
- **Rich Metadata**: Store multiple related URLs per note (docs, homepage, repo, etc.)
- **No Lock-in**: Your bookmarks live in plain markdown files you control
- **Powerful Search**: Leverage Obsidian's existing organization with Raycast's quick access

## Features

- 🔍 **Direct Vault Scanning**: Scans your Obsidian vault to find all URLs in frontmatter
- 🚀 **Quick URL Access**: Open URLs from your notes without opening Obsidian
- 🎯 **URL Property Detection**: Automatically finds URLs in ANY frontmatter property
- ⚡ **Fast Search**: Quickly find notes by title or URL
- 📊 **Smart Sorting**: Sort by frecency (frequency + recency) or alphabetically
- ⌨️ **Keyboard Shortcuts**: Quick access to related URLs from the same note

## Prerequisites

- **Raycast**: This is a Raycast extension, so you need [Raycast](https://raycast.com) installed
- **Obsidian Vault**: An existing Obsidian vault with markdown files containing URLs in frontmatter

## Installation

### From Raycast Store (Coming Soon)
The extension will be available in the Raycast Store once published.

### Manual Installation
See the [Development Guide](DEVELOPMENT.md#development-setup) for instructions on installing from source.

## Configuration

Configure the extension in Raycast preferences:

### Settings
- **Use Frecency Sorting**: Sort notes by frequency and recency of use (default: enabled). When disabled, sorts alphabetically by note title.


## Usage

### Open Link
The main command that displays a list of all notes with URLs in their frontmatter. You can:
- Search notes by title or URL
- Open URLs in your default browser
- Copy URLs to clipboard
- Quickly open other URLs from the same note using keyboard shortcuts
- URLs within each note are sorted with homepage first, then alphabetically by property name

### Select Vault
Choose which Obsidian vault to scan for URLs. The extension remembers your selection for future use.

### Quick Access to Other URLs
When viewing any URL from a note that has multiple URLs, you can use keyboard shortcuts to quickly open other URLs from the same note:
- `⌘D` - Open documentation/docs URL
- `⌘H` - Open help URL
- `⌘G` - Open GitHub repository URL
- `⌘⇧W` - Open web app URL
- `⌘B` - Open dashboard URL
- `⌘O` - Open homepage URL

These shortcuts work regardless of which URL is currently selected, making it easy to jump between different resources for the same project or topic.

## How URL Detection Works

The extension automatically detects any frontmatter property that contains a valid URL. You can use any property name you want - if it contains a valid URL (starting with http:// or https://), it will be found and displayed.

Common property names like `homepage`, `documentation`, `github`, etc. get special icons for easier visual identification, but the extension works with any property name you choose to use.

## Example Frontmatter

The extension will detect URLs in ANY frontmatter property:

```yaml
---
title: "My Project"
homepage: https://example.com
documentation: https://docs.example.com
github: https://github.com/username/project
custom_link: https://custom.example.com
my_special_url: https://special.example.com
---

# My Project Notes
...
```

All URLs above will be found and displayed, regardless of the property name used.

## Troubleshooting

### Extension doesn't find my vault
- Ensure the vault path in preferences points to the root directory of your Obsidian vault
- Check that the directory contains `.obsidian` folder and `.md` files

### URLs not appearing
- Verify your notes have valid URLs in frontmatter properties (any property name works)
- Check that the frontmatter is valid YAML format
- Ensure URLs start with http:// or https://
- Try running a manual refresh

### Performance issues
- The extension scans your vault files each time it runs
- For very large vaults (10,000+ files), scanning may take a moment. (See [ROADMAP](./ROADMAP.md).)

## Why a Separate Extension?

This extension is intentionally separate from the main [Obsidian extension](https://www.raycast.com/marcjulian/obsidian) because it serves a fundamentally different use case:

- **Different Purpose**: While the main Obsidian extension focuses on note management and creation, this extension treats Obsidian as a **structured bookmark manager** for URLs stored in frontmatter properties
- **Direct File Access**: This extension bypasses Obsidian entirely, directly scanning markdown files to extract URLs. The main extension interacts with Obsidian through its URI protocol
- **Specialized Workflow**: Designed for users who store project links, documentation URLs, and web resources in their notes' frontmatter and want quick access without opening Obsidian
- **No Feature Overlap**: The commands provided (opening URLs from frontmatter) don't duplicate any functionality from the main extension's note search, creation, or daily note features

## Development

For information about contributing to this project, building from source, or modifying the extension, see the [Development Guide](DEVELOPMENT.md).

## License

MIT - See [LICENSE](LICENSE) file for details

## Author

Oliver Steele - [@osteele](https://github.com/osteele)
