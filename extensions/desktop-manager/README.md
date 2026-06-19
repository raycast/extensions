# Desktop Manager

A Raycast extension to search and organize your desktop files.

Inspired by the [Downloads Manager](https://www.raycast.com/thomas/downloads-manager) extension.

## Features

- **Manage Desktop**: Browse and organize all files on your desktop
- **Quick Actions**: Fast access to your most recent desktop files
- **File Operations**: Open, copy, delete, and show files in Finder
- **Configurable**: Customize desktop folder path and deletion behavior

## Commands

### Manage Desktop
Browse and organize all files on your desktop with a clean interface. Features:
- File list with icons and last modified dates
- Quick actions (open, copy, delete, show in Finder)
- Keyboard shortcuts for efficient navigation

### Quick Actions
- **Open Latest Desktop File**: Instantly open the most recent file
- **Copy Latest Desktop File**: Copy the latest file to clipboard
- **Show Latest Desktop File**: Show the latest file in Finder
- **Delete Latest Desktop File**: Delete the most recent file
- **Paste Latest Desktop File**: Paste the latest file to the active app

## Configuration

Access preferences to customize:
- **Desktop Folder**: Set custom desktop folder path (default: ~/Desktop)
- **Latest File Order**: Choose how to determine the "latest" file (modified, created, added, or birth time)
- **Deletion Behavior**: Choose between moving to trash or permanent deletion
- **Show Hidden Files**: Toggle visibility of hidden files (via command preferences)

## Installation

1. Install via Raycast Store or
2. Clone this repository and run `npm run dev` for development

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Desktop Manager" or "Manage Desktop"
3. Browse your desktop files or use quick actions for instant access

## Keyboard Shortcuts

- **⌘ + R**: Reload desktop files
- **⌘ + Shift + C**: Copy file
- **⌘ + O**: Open with specific application
- **⌘ + Y**: Toggle Quick Look
- **Ctrl + X**: Delete file
- **Ctrl + Shift + X**: Delete all desktop files

## Requirements

- macOS
- Raycast
- Desktop folder access permissions