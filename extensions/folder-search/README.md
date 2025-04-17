# Folder Search

A powerful Raycast extension for searching, managing, and organizing folders on your Mac. Quickly find folders, move files, and perform common file operations with keyboard shortcuts.

## Features

### 🔍 Smart Search
- Search folders across your entire Mac or specific scopes
- Sort results by last used date for quick access to frequently used folders
- Filter results by pinned folders, user directory, or entire Mac
- Support for exact matching using [term] syntax
- Case-sensitive and case-insensitive search options
- Uses Spotlight for fast search results

### 📌 Folder Management
- Pin frequently used folders for quick access
- Reorder pinned folders using Move Up/Down actions
- View detailed folder information including:
  - Last used date
  - Creation date
  - Modification date
  - Use count
  - File permissions
  - File size

### 🚀 Quick Actions
- Open folders in Finder
- Open folders with specific applications
- Show folder info in Finder
- Copy folder path, name, or entire folder
- Create quicklinks to folders
- Move files to selected folders
- Move folders to Trash
- Navigate to enclosing or sub-folders

### ⚙️ Customization
- Configure maximum number of search results
- Filter system Library folders (excluding cloud storage)
- Enable/disable custom AppleScript plugins
- Configure plugins folder location

### 🔌 Plugin System
Create custom AppleScript plugins to extend functionality. A sample plugin is included in the `plugins` folder:

```js
exports.FolderSearchPlugin = {
  title: "Test Plugin",
  shortcut: { modifiers: ["cmd", "shift"], key: "t" },
  icon: "🔍",
  appleScript: (result) => `
    -- Show notification with folder details
    display notification "Folder: ${result.kMDItemFSName}
    Last Used: ${result.kMDItemLastUsedDate}
    Size: ${result.kMDItemFSSize} bytes" with title "Folder Search Test"
    
    -- Open folder in Finder and show info
    tell application "Finder"
      activate
      set targetFolder to (POSIX file "${result.path}") as alias
      reveal targetFolder
      open information window of targetFolder
    end tell
    
    -- Log folder details to console
    do shell script "echo 'Test Plugin: ${result.kMDItemFSName} (${result.path})' >> ~/folder-search-test.log"
  `
};
```

To use plugins:
1. Enable plugins in Raycast preferences
2. Set the plugins folder path (see below for path format)
3. Place your plugin files (`.js` extension) in the plugins folder
4. Restart Raycast to load the plugins

Plugin Folder Path Format:
- Use absolute paths (starting with `/`)
- Trailing slash is optional (both `/path/to/plugins` and `/path/to/plugins/` work)
- The path must exist and be readable
- Common paths:
  - Default: `~/Library/Application Support/Raycast/extensions/folder-search/plugins/`
  - Development: `/path/to/your/folder-search/plugins/`

### 🎯 Keyboard Shortcuts
- `⌘ + ↑` - Move to enclosing folder
- `⌘ + ↓` - Enter selected folder
- `⌘ + .` - Copy folder
- `⌘ + ⇧ + .` - Copy folder name
- `⌘ + ⇧ + ,` - Copy folder path
- `⌘ + ⇧ + l` - Create quicklink
- `⌘ + ⇧ + p` - Toggle pin status
- `⌘ + ⇧ + d` - Toggle details view
- `⌘ + i` - Show info in Finder
- `⌘ + o` - Open with...
- `⌃ + x` - Move to Trash

### 📊 Advanced Features
- Support for cloud storage paths (iCloud, Dropbox, Google Drive, OneDrive)
- Library folder filtering
- Language-agnostic operation

## Installation

1. Install the extension from the Raycast Store
2. Configure preferences in Raycast settings
3. (Optional) Create custom plugins in your plugins folder