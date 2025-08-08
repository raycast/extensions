# Directory Browser

A powerful Raycast extension for browsing and navigating directories with an intuitive split-view interface that shows detailed file information.

## Features

- **Split-view interface** - Directory listing with detailed file information panel
- **Quick navigation** - Keyboard shortcuts for common directories and manual path entry
- **File details** - View file size, creation/modification dates, permissions, and type information
- **Search functionality** - Filter files and folders in real-time
- **Smart path handling** - Support for relative paths, `~` shortcut, and path validation
- **Persistent preferences** - Remembers your detail panel preference and default directory
- **Error recovery** - Helpful options when directories can't be accessed

## Usage

1. Launch Raycast and type "Open Directory" or "directory"
2. Enter a directory path or use the default directory
3. Navigate through the split-view interface:
   - **Left panel**: Directory contents with search
   - **Right panel**: Detailed file/folder information
4. Use keyboard shortcuts for quick navigation:
   - **⌘D** - Toggle details panel
   - **⌘H** - Go to home directory
   - **⌘R** - Go to root directory
   - **⌘G** - Enter custom path
5. Click on directories to navigate or files to open them

## Configuration

You can set a default directory path in the extension preferences:

1. Open Raycast preferences
2. Go to Extensions
3. Find "Open Directory" and click on it
4. Set your preferred default directory in the "Default Directory" field

## Development

This extension is built with:

- TypeScript
- Raycast API
- Node.js

To develop:

```
npm run dev
```

To build:

```
npm run build
```
