# Raycast Symlink Manager

A Raycast extension to easily create and manage symbolic links on macOS.

## Features

- Create symbolic links with a user-friendly interface
- List and manage existing symlinks
- Force creation option to replace existing links
- Visual indicators for valid/broken symlinks
- Easy access to source and destination paths

## Commands

### Create Symlink (`⌘ + K` > `Create Symlink`)

Create new symbolic links with the following options:

- **Name**: A unique friendly name for the symlink
- **Source**: Select the source file or directory
- **Destination**: Select the destination directory
- **Force Creation**: Replace an existing symlink with the same name. Only symlinks are replaced; a real file or folder is never overwritten.

### List Symlinks (`⌘ + K` > `List Symlinks`)

View and manage your existing symlinks:

- See all created symlinks with their names and paths
- Status indicators: valid, broken (source gone), missing, or replaced by something else
- Search functionality to find specific symlinks
- Actions for each symlink:
    - Show source in Finder
    - Open source location
    - Open destination location
    - Copy source path
    - Copy destination path
    - Delete symlink (with confirmation). Only the link itself is removed, and only if it is still the link this extension created.

## Keyboard Shortcuts

### In List View

- `↵`: Show source in Finder
- `⌘ + O`: Open source location
- `⌘ + ⇧ + O`: Open destination location
- `⌘ + C`: Copy source path
- `⌘ + ⇧ + C`: Copy destination path
- `⌃ + X`: Delete symlink

## Installation

1. Install [Raycast](https://raycast.com/)
2. Open Raycast
3. Search for "Store" and open Raycast Store
4. Search for "Symlink Manager" and install

### From source

Requires Node.js 22.22 or later (`nvm use` picks up the version in `.nvmrc`).

```bash
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast. It stays installed after you stop the dev server.

## Technical Details

- Symlinks are created with Node's `fs.symlink`. No shell commands are run.
- Symlink information is stored in a JSON file in the extension's support directory
- The extension validates paths before creating links, and refuses to link a folder into itself, including through folder symlinks
- Before replacing or deleting a link, the extension moves it aside and checks it there, so a real file or folder that takes its place is never touched
- If saving a new link to the list fails, the link is removed again and any link it replaced is restored

## Credits

Originally created by [julesbsz](https://www.raycast.com/julesbsz).

## Support

For issues and feature requests, please create an issue on the GitHub repository.
