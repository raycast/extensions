# File Organizer for Raycast

A Raycast extension that helps you organize files by suggesting the most appropriate location on your system based on file analysis.

## Features

- **Intelligent Location Suggestions**: Analyzes file attributes to recommend where it should be stored
- **Quick File Organization**: Move files to their proper location with just a few clicks
- **Flexible Configuration**: Customize which directories to scan and exclude

## How It Works

1. Select a file in Finder
2. Trigger the "Organize File" command in Raycast
3. The extension analyzes your file and scans your system for relevant locations
4. Choose from suggested locations based on confidence scores
5. The file is moved to your chosen location

## Algorithm

The extension suggests locations based on several factors:

- File name matching
- Folder name matching
- Parent folder matching

