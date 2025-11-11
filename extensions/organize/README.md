# Organize

Automatically organize your Downloads, Desktop, and Temp folders on macOS with intelligent file management and undo capabilities.

## Features

### Three Organization Commands

1. **Organize Downloads** - Clean up your Downloads folder
   - Removes duplicate files (keeps oldest copy)
   - Archives files older than 60 days
   - Moves large files (>1GB) to dedicated folder
   - Categorizes files by type (Music, Videos, Images, Documents, etc.)
   - Consolidates loose folders

2. **Organize Desktop** - Keep your Desktop tidy
   - Removes duplicate files
   - Archives files older than 30 days (shorter threshold)
   - Moves large files (>1GB) to dedicated folder
   - Categorizes files by type
   - Consolidates loose folders

3. **Organize Temp Folder** - Organize by creation date
   - Removes duplicate files
   - Moves large files (>1GB) to dedicated folder
   - **Organizes files into date-named folders** (e.g., "11-5th November 2025")
   - Automatically cleans empty date folders

### Key Features

- **🔍 Smart Duplicate Detection**: Uses MD5 hashing to find exact duplicates, saves disk space
- **📦 Large File Management**: Automatically identifies and organizes files over 1GB
- **🗂️ 20+ File Categories**: Intelligently sorts files into Music, Videos, Images, PDFs, Documents, and more
- **🗑️ Safe Deletion**: Moves files to macOS Trash instead of permanent deletion
- **↩️ Full Undo Support**: Every operation can be reversed with one click (⌘Z)
- **📊 Detailed Summary**: See exactly what was organized with space saved statistics

### Safety Features

- All file operations are tracked and can be undone
- Automatic filename conflict resolution
- Preserves oldest file when duplicates are found
- Uses macOS Trash for safe deletion

## Requirements

- macOS (uses AppleScript for Trash operations)
- Raycast application

## How to Use

1. Open Raycast (⌘ + Space)
2. Search for "Organize Downloads", "Organize Desktop", or "Organize Temp"
3. Press Enter to run
4. View the detailed summary of changes
5. Press ⌘Z or click "Undo All Changes" to reverse if needed

## File Categories

The extension recognizes 20+ file categories including:

- **Media**: Music, Videos, Images
- **Documents**: PDFs, Word/Pages, Excel/Numbers, PowerPoint/Keynote, Text files
- **Creative**: Design files, Fonts, 3D models
- **Technical**: Code, Data files, Software installers, Archives
- **Other**: Ebooks, Subtitles, Torrents, and more

## Notes

- Files moved to Trash cannot be automatically restored - you'll need to manually restore them from Trash if needed
- The Temp folder organizes files by creation date rather than file type
- All operations show detailed summaries with undo options
