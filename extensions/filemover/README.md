# Filemover

Filemover is a highly efficient Raycast extension that allows you to instantly move or copy currently selected files in Finder (or your Desktop) to predefined or custom folders without taking your hands off the keyboard.

A blazing fast and powerful extension to route, rename, and manage your Mac files system-wide without ever touching a Finder window.

![Filemover Demo](assets/FM_BatchRename_History_Undo_Demo.gif)

## Features

- **System-Wide Detection:** Automatically detects any selected files in macOS Finder or on your Desktop. No need to pass files manually.
- **Advanced Batch Rename:** Hit `Cmd + R` to rename and move files simultaneously. Completely replace names, add prefixes/suffixes, use advanced find & replace, and dynamically append padded indexes or current dates.
- **Action History:** Accidentally moved something? Open the *File Move History* command to view your last 20 operations and instantly revert any of them with a single keystroke.
- **System-Wide Undo:** Press `Cmd + Z` right inside Filemover to instantly undo your last action. You can even bind the invisible *Undo Last File Move* command to a global hotkey to undo file operations system-wide without opening the extension.
- **Smart Duplicate Handling:** Safely handles filename conflicts by intelligently auto-indexing new files.
- **Favorites & Recents:** Instantly access a unified list of your Favorites and 4 most recently used folders right on launch. No deep menu navigation required.
- **Create New Folders:** Hit `Cmd + N` to create a brand new directory on-the-fly and move your files directly into it.
- **Detailed Preview:** Always see exactly which files are queued up in the Raycast detail view before confirming.

## Usage

1. Select one or multiple files in Finder or on your Desktop.
2. Open Raycast and run the `Filemover` command.
3. The extension will display your Favorite, Recent, and Default (Downloads, Desktop, Documents) folders.
4. Highlight a target folder and press:
   - `Enter` to Move
   - `Cmd + D` to Copy
   - `Cmd + R` to open the Advanced Batch Rename & Move form
   - `Cmd + N` to create a new folder and move the files there
   - `Cmd + Shift + F` to pick a custom destination
   - `Cmd + Z` to Undo the last file operation

## Setup

No advanced setup required! The extension works natively with macOS File System APIs. You can start adding your own Favorite directories right from the Raycast Action Menu (`Cmd + K`).

Enjoy a clutter-free Desktop!
