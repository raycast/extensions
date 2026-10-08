# Accordance Bible Extension

A Raycast extension that interfaces with **Accordance Bible Software** to retrieve and display scripture verses.

## ⚠️ Requirements

**This extension requires Accordance Bible Software to be installed on your Mac.**

- **Download Accordance**: Visit [AccordanceBible.com](https://www.accordancebible.com/) to purchase and download Accordance Bible Software
- **macOS**: This extension only works on macOS
- **Accessibility Permissions**: Grant accessibility permissions for AppleScript execution when prompted

Without Accordance installed, this extension will not function.

## Features

- **Search Bar Input**: Type scripture references directly in the Raycast search bar (e.g., "John 3:16")
- **Module Selection**: Dropdown to choose from available Accordance text modules
- **List View Display**: View formatted verse text in Raycast's list interface
- **Quick Actions**: Copy verse text, view full details, and copy references
- **Automatic Launch**: Accordance launches automatically if not running
- **Sequential Reading**: Read through Bible verses chapter by chapter
- **Advanced Search**: Access Accordance's powerful search tools
- **Workspace Management**: Open saved Accordance workspaces

## Usage

1. Ensure Accordance Bible Software is installed and running
2. Use the dropdown in the search bar to select your preferred Bible text module
3. Type a scripture reference in the Raycast search bar (e.g., "Genesis 1:1", "Psalm 23", "Matthew 5:1-10")
4. Press ⌘↵ (Command + Enter) or use the "Get Verse" action to retrieve the verse
5. View the full verse text in the detail pane on the right
6. Use actions to copy text or copy just the reference

## System Requirements

- **macOS** (required for Accordance compatibility)
- **Accordance Bible Software** (see requirements section above)
- **Accessibility permissions** for AppleScript execution (granted automatically when needed)

## Development

```bash
npm run dev     # Start development mode
npm run build   # Build for production
npm run lint    # Check code style
npm run publish # Publish to Raycast Store
```