# Save Link

Save a link into a file for later reference and organization.

## Features

- **Quick Link Saving**: Instantly save any URL with a custom title
- **Custom File Name**: Choose how your saved links are named
- **Create Link File from both Clipboard and Active Tab**: Save links directly from your clipboard or the currently active tab
- **Clean Up Cache**: Automatically remove old or unused link files

## What is a .webloc file?

.webloc is a macOS Internet shortcut (bookmark) file. It’s a tiny XML property list that stores a single URL.

- Double‑click to open the link in your default browser
- Drag into Finder, the Dock, or project folders
- Rename freely — the destination URL is stored inside the file
- Sync‑friendly via iCloud Drive, Dropbox, etc.

This extension creates .webloc files so you can keep links alongside your files and projects.

## Installation

1. Install from the Raycast Store
2. Grant necessary file system permissions when prompted
3. Enjoy!

## Usage

You may find a showcase video in this [PR](https://github.com/raycast/extensions/pull/20521).

### Where are files saved?

- Files are created in a cache folder: `~/Library/Caches/com.raycast.save-link`
- The newest file is copied to your clipboard so you can paste or drag it anywhere
- Up to 20 recent files are kept; older ones are cleaned automatically
- Use the “Open Save Folder” command to access the cache

## Required Permissions

- **File System Access**: Required to save links to your chosen directory
- **Clipboard Access**: Optional, for automatically detecting URLs from clipboard

## Commands

- `Save Link` - Save a new link with custom title and format
- `Save Link from Clipboard` - Quick save URL from clipboard
- `Open Save Folder` - Navigate to your cached links directory
