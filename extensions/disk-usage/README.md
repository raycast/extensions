# Disk Usage

Analyze disk space usage and identify large files and folders in your home directory. This extension helps you quickly find what's taking up space on your Mac.

## Features

- **Disk Space Analysis**: Scan your home directory to identify large files and folders
- **Visual Size Indicators**: See file sizes with visual usage bars
- **Navigate Folders**: Browse through directories to find space-consuming files
- **Delete Files**: Move files and folders to Trash directly from the extension
- **Bulk Selection**: Select multiple items for batch deletion
- **Size Updates**: Automatically recalculates folder sizes when files are deleted

## Requirements

- **macOS**: This extension requires macOS and uses the `du` command
- **Full Disk Access**: The extension needs Full Disk Access permissions to scan your home directory

### Granting Full Disk Access

1. Open **System Settings** (or **System Preferences** on older macOS versions)
2. Go to **Privacy & Security** → **Full Disk Access**
3. Click the **+** button to add an application
4. Navigate to `/Applications/Raycast.app` and add it
5. Make sure the checkbox next to Raycast is enabled

## Usage

1. Open Raycast and search for "Disk Usage"
2. The extension will automatically scan your home directory
3. Browse through folders by selecting them
4. Use **⌘S** to select files for bulk deletion
5. Use **⇧⌫** (Shift+Delete) to delete individual files
6. Navigate back using **⌘[** or the back button

## Permissions

This extension requires Full Disk Access to scan your home directory. Without this permission, the scan will not show full usage or fail with an error message.
