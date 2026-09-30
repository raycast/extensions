# Unpackr

Intelligently merge multiple ZIP files into a single organized folder with automatic deduplication. Perfect for Google Takeout archives, photo collections, backups, and any batch of ZIP files.

## The Problem

When downloading large archives (like Google Photos via Google Takeout), they're split into multiple ZIP files. Manually merging these creates messy, overlapping directories and risks duplicate files or overwriting content.

**Unpackr solves this automatically.**

## What It Does

- **Finds and extracts** all matching ZIP files from your input folder
- **Intelligently merges** contents into a single organized output folder
- **Detects duplicates** using SHA256 file hashing and skips them
- **Resolves conflicts** by auto-renaming files with same name but different content
- **Preserves structure** from Google Takeout or maintains your folder organization
- **Provides progress** with real-time notifications and statistics
- **Cleans up** by optionally deleting original ZIPs after successful merge

## Features

- ✨ **Universal ZIP Support** - Works with Google Takeout, iCloud exports, or any ZIP files
- 🔍 **Smart Deduplication** - SHA256 hash comparison detects true duplicates
- 🎯 **Conflict Resolution** - Auto-renames files with same name but different content
- 🛡️ **Zip Bomb Protection** - Safe Mode detects suspicious archives with >100x compression ratios
- 📊 **Progress Tracking** - Real-time notifications with statistics
- 📝 **Error Logging** - Automatic detailed error logs saved to input folder when issues occur
- 🔒 **Safe & Secure** - Validates paths, preserves originals, handles errors gracefully
- 🚀 **Fast & Efficient** - Processes large archives quickly with streaming operations

## Installation

Install from the [Raycast Store](https://raycast.com/) by searching for "Unpackr" or visit the [extension page](#).

## Usage

1. Open Raycast and search for **"Merge ZIP Files"**
2. **Input Folder**: Select folder containing your ZIP files
3. **Output Folder**: Choose where merged files should go
4. **Output Folder Name** *(optional)*: Create a subfolder for organized output
5. **ZIP Filter**: Match ZIP files by name (e.g., "takeout-", "photos", "backup")
6. **Delete ZIPs** *(optional)*: Remove originals after successful merge
7. **Safe Mode** *(recommended)*: Enabled by default, protects against zip bombs (files with >100x compression ratio)
8. Click **"Start Merging"** and watch the progress!

**Note**: If any errors occur during processing, a detailed error log file (`unpackr-errors-[timestamp].log`) will be automatically created in your input folder.

### Example

Merging 3 Google Takeout ZIPs:
```
Input:  ~/Downloads/takeout-001.zip, takeout-002.zip, takeout-003.zip
Output: ~/Pictures
Result: ~/Pictures/Google Photos/
        ├── 2023/
        ├── 2024/
        └── 2025/

Statistics: 5,420 files merged, 1,230 duplicates skipped, 15 conflicts renamed
```

## Preferences

Configure default folders in Raycast extension settings:
- **Default Input Folder** - Where your ZIP files are typically located
- **Default Output Folder** - Where merged files should go

## Development

Want to contribute or run locally?

```bash
git clone https://github.com/shak/unpackr.git
cd unpackr
npm install
npm run dev
```

## Technical Stack

- **TypeScript** + React
- **Raycast API** for UI
- **yauzl** for ZIP extraction
- **SHA256** for deduplication
- **Zip Bomb Protection** with compression ratio checks (>100x)
- **Automatic Error Logging** for troubleshooting
- Handles edge cases: corrupted files, permissions, cross-device moves, special characters, macOS metadata, and more

## License

MIT - See [LICENSE](LICENSE) for details

---

<p align="center">
  Made with ❤️ for the Raycast community
</p>
