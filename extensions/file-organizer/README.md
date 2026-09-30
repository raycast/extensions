# File Organizer for Raycast

A Raycast extension that helps you organize files by suggesting the most appropriate location on your system based on file analysis.

⚠️ **Important Setup & Performance Notes**

- This extension requires proper configuration of scan directories and exclusions for optimal performance
- Raycast needs access to scan the configured directories
- Scanning large directory trees or too many directories can cause slowdowns or timeouts

## Configuration

### Scan Directories

Default directories scanned:

```
~/Documents, ~/Desktop, ~/Downloads, ~/Pictures, ~/Movies, ~/Music
```

- Increase this list to scan more locations
- Each additional directory will increase scan time
- Ensure Raycast has permission to access all configured directories

### Excluded Directories

Default directories excluded:

```
node_modules, .git, .vscode, .next, dist, build, .cache, .idea, __pycache__, target, vendor, coverage, .env, tmp, .tmp, .sass-cache
```

- These are excluded regardless of where they appear in the directory tree
- Properly configuring exclusions is crucial for performance
- Add any large directories you don't want scanned

### Scan Depth

Default: 10 levels

- Controls how deep the extension searches in directory trees
- Higher values mean more nested directories are scanned

## Features

- **Organize files**: Especially useful for files that you need to archive but do not need to access frequently.
- **Intelligent Location Suggestions**: Analyzes file attributes to recommend where it should be stored
- **Quick File Organization**: Move files to their proper location with just a few clicks

## How It Works

1. Select a file in Finder
2. Trigger the "Place File" command in Raycast
3. The extension analyzes your file and scans your system for relevant locations
4. Choose from suggested locations based on confidence scores
5. The file is moved to your chosen location

## Algorithm

The extension suggests locations based on several factors:

- File name matching
- Folder name matching
- Parent folder matching

## Troubleshooting

If the extension is slow or unresponsive:

1. Reduce the scan depth in preferences
2. Add large directories to the exclude list
3. Remove unnecessary scan directories
4. Check if Raycast has necessary permissions
5. Verify the directories in preferences are correctly formatted (comma-separated)
