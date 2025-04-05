# Finder File Actions

A Raycast extension that provides various actions for files selected in Finder.

## Commands

### Move to Folder

Quickly move or copy selected files in Finder to a destination folder of your choice. Alfred users will be familiar with this functionality.

#### Features

- Move or copy one or more files selected in Finder to any folder
- Fast and reliable folder search using macOS Spotlight (`mdfind`)
- Smart sorting of search results based on relevance and recency
- Pin frequently used folders for quick access
- Recently used folders history
- Folder navigation in case you don't know the exact folder name
- Indication of the selected files
- Visual feedback for successful/failed operations
- Metadata display (last used date, modification date, file type)

#### Performance

- Concurrent file operations (up to 3 streams at a time)
- Streaming for large files with minimal memory usage
- Progress tracking for both individual files and batches
- Continues on errors (failing files don't stop the batch)
- Smart folder history management

#### Usage

1. Select one or more files in Finder
2. Trigger the "Move to Folder" or "Copy to Folder" command in Raycast
3. Search for your destination folder or navigate through directories
4. Press Enter to navigate to a folder, Cmd+Return to move/copy files

#### Keyboard Shortcuts

- `Enter`: Navigate to the selected folder
- `Cmd+Return`: Move files to the selected folder
- `Cmd+Shift+Return`: Copy files to the selected folder
- `Cmd+Shift+D`: Toggle details view
- `Cmd+Shift+P`: Pin/Unpin folder
- `Cmd+Shift+R`: Remove folder from recent history

## Installation
> [!IMPORTANT]
> this extension is not available yet in the Raycast store. You can see the ticket [here](https://github.com/raycast/extensions/pull/17705), so if you want to see it in the store, you can upvote it or smth.
> in the meantime, you can install it manually.

### Prerequisites

- [Raycast](https://raycast.com/) installed on your machine
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) runtime installed

### Using *npm*

```bash
# Clone the repository
git clone https://github.com/pa1ar/finder-file-actions
cd finder-file-actions

# Install dependencies
npm install

# Build the extension
npm run build

# Create a symlink in Raycast's extension directory
npm run dev
```

### Using *Bun* 

```bash
# Clone the repository
git clone https://github.com/pa1ar/finder-file-actions
cd finder-file-actions

# Install dependencies
bun install

# Build the extension
bun run build

# Create a symlink in Raycast's extension directory
bun run dev
```

After running these commands, the extension will be available in Raycast. You can close the terminal, and the extension will remain functional. To access it, simply:

1. Open Raycast
2. Search for "Move to Folder" or "Copy to Folder"
3. Start using the extension.

## Credits

This extension is based on the [Folder Search](https://www.raycast.com/GastroGeek/folder-search) extension originally created by [GastroGeek](https://www.raycast.com/GastroGeek). The folder searching functionality was adapted from the original extension, while adding new capabilities for file operations.