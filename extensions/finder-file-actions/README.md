# Finder File Actions

A Raycast extension that provides various actions for files selected in Finder.

## Commands

### Move to Folder

Quickly move or copy selected files in Finder to a destination folder of your choice. Alfred users will be familiar with this functionality.

#### Features

- Move or copy one or more files selected in Finder to any folder
- Fast and reliable folder search using macOS Spotlight (`mdfind`)
- Smart sorting of search results based on relevance and recency
- Recently used folders for quick access
- Folder navigation in case you don't know the exact folder name
- Indication of the selected files
- Visual feedback for successful/failed operations
- Metadata display (last used date, modification date, file type)

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

## Credits

This extension is based on the [Folder Search](https://www.raycast.com/GastroGeek/folder-search) extension originally created by [GastroGeek](https://www.raycast.com/GastroGeek). The folder searching functionality was adapted from the original extension, while adding new capabilities for file operations.