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

## Plugins

You can add your own custom `AppleScript` plugins to Folder Search. These appear as actions, under the sub-heading 'Plugins' within Folder Search.

The steps are as follows:

* Configure the Folder Search extension via Raycast
    * Ensure the `Plugins Enabled` option is checked
    * Populate `Plugins Folder (Absolute Path)` with a valid **absolute** path to where you plugins reside
        * e.g: `/Users/GastroGeek/Documents/FolderSearchPlugins`

* Create one or more plugins with the following schema (they are just `.js` files):

### e.g. Plugin Path

```
/Users/GastroGeek/Documents/FolderSearchPlugins/open-alt.js
```

### e.g. Plugin file contents (open-alt.js)

```js
// note the export name!
exports.FolderSearchPlugin = {
  // the title of the action as shown
  // in the Actions Menu in Raycast.
  title: 'Open Alt',

  // the desired keyboard shortcut in the same
  // format as with Raycast's API but with only
  // single braces: `{` and `}`.
  shortcut: { modifiers: ["cmd", "shift"], key: 'a' },

  // the `Icon` name without the Icon enum prefix.
  icon: 'Link',

  // a function which takes the result that was selected at the time of execution and returns a valid AppleScript. This AppleScript is what gets executed.
  appleScript: (result) => {
    return `do shell script "open '${result.path}'"`;
  }
}
```

For reference, the `result` argument passed into the `appleScript` function is as follows (based on mdfind properties)

```js
{
  path: '/Users/GastroGeek/Music',
  kMDItemDisplayName: 'Music',
  kMDItemFSCreationDate: '2016-04-22T20:42:52.000Z',
  kMDItemFSName: 'Music',
  kMDItemContentModificationDate: '2022-07-08T15:44:01.000Z',
  kMDItemKind: 'Folder',
  kMDItemLastUsedDate: '2022-09-14T10:09:45.000Z'
}
```

Plugin Folder Path Format:
- Use absolute paths (starting with `/`)
- Trailing slash is optional (both `/path/to/plugins` and `/path/to/plugins/` work)
- The path must exist and be readable
- Common paths:
  - Default: `/Users/<username>/Library/Application Support/Raycast/extensions/folder-search/plugins/`
  - Development: `/path/to/your/folder-search/plugins/`

### 🎯 Keyboard Shortcuts
- `⌘ + ⌥ + ↑` - Navigate to enclosing folder
- `⌘ + ⌥ + ↓` - Enter selected folder
- `⌘ + .` - Copy folder
- `⌘ + ⇧ + .` - Copy folder name
- `⌘ + ⇧ + ,` - Copy folder path
- `⌘ + ⇧ + L` - Create quicklink
- `⌘ + ⇧ + P` - Toggle pin status
- `⌘ + ⇧ + D` - Toggle details view
- `⌘ + ⇧ + S` - Move Finder selection to folder
- `⌘ + O` - Open with...
- `⌃ + X` - Move to Trash

### 📊 Advanced Features
- Support for cloud storage paths (iCloud, Dropbox, Google Drive, OneDrive)
- Library folder filtering
- Language-agnostic operation

## Installation

1. Install the extension from the Raycast Store
2. Configure preferences in Raycast settings
3. (Optional) Create custom plugins in your plugins folder