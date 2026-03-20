# Downloads Cleaner

## Overview

Downloads Cleaner is a Raycast extension for macOS that helps you identify stale files and tag them in Finder. The command checks each file's access time in a selected folder, compares it with a configurable threshold in days, and applies the selected Finder label color to files that are older than that threshold.

## How It Works

When you run the command, the extension scans the target directory, evaluates file age based on access time, and tags matching files through Finder. Progress is shown in Raycast while scanning and tagging are in progress, so you can monitor execution in real time. If some files cannot be updated, processing still continues and a partial-failure summary is shown at the end.

## Configuration

The command is configured in Raycast preferences.

- Download Folder Path: selects the directory to scan through a directory picker.
- Time Threshold (Days): defines how old a file must be before it is tagged.
- Finder Tag Color: controls which Finder label color is applied.

## Development

Use the following commands during development:

- `npm run dev` starts interactive development in Raycast.
- `npm run build` builds the extension.
- `npm run lint` validates manifest, formatting, and code quality.
