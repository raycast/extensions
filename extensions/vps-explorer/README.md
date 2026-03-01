# VPS Explorer

Browse, upload, download, and manage files on your VPS server directly from Raycast.

## Features

- 📂 **Browse Files** - Navigate through your VPS directories with a familiar file browser interface
- ⬇️ **Download Files** - Download files from VPS to your local Downloads folder
- ⬆️ **Upload Files** - Upload files from your Mac to VPS
- 📁 **Create Directories** - Create new folders on your VPS
- ✏️ **Rename Files** - Rename files and directories
- 🗑️ **Delete Files** - Remove files and directories
- 🔍 **Sort Files** - Sort by name, size, date, or type

## Setup

1. Install the extension
2. Open Raycast preferences for "VPS Explorer"
3. Enter your VPS credentials:
   - **Host**: Your VPS IP address or hostname
   - **Port**: SSH port (default: 22)
   - **Username**: SSH username (default: root)
   - **Password**: SSH password

## Usage

- Press `Cmd+Space` and search for "Browse VPS Files"
- Navigate directories by pressing Enter on folders
- Press `Cmd+U` to upload files
- Press `Cmd+N` to create new directory
- Press `Cmd+R` to rename files
- Press `Cmd+Delete` to delete files

## Requirements

- macOS (Raycast requirement)
- SSH access to your VPS server
- `scp` command available (comes with macOS)
