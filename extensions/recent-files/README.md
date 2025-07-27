# Recent Files

A Raycast extension that displays the most recently created files from multiple directories with image preview support.

## Features

- **Multi-directory Support**: Monitor multiple directories simultaneously by specifying them as a comma-separated list
- **Image Preview**: Automatically displays image previews in the detail panel when selecting image files
- **Smart Loading**: Initially shows 30 files with the option to load more as needed
- **Detailed Metadata**: View file information including name, location, size, and creation date in the detail panel
- **Quick Actions**:
  - **Enter**: Copy file path to clipboard (default action)
  - **Cmd+Enter**: Open file
  - **Cmd+Shift+F**: Show in Finder
  - **Cmd+Shift+C**: Copy file name
  - **Cmd+,**: Open extension preferences

## Installation

### From Raycast Store
This extension is available through the Raycast Store. Search for "Recent Files" in Raycast's extension store to install.

### From Source
```bash
# Clone the repository
git clone https://github.com/yourusername/raycast-recent-files.git
cd raycast-recent-files

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build and publish to Raycast
npm run build && npm run publish
```

## Configuration

### Extension Preferences

- **Target Directories**: Comma-separated list of directories to scan
  - Example: `~/Downloads, ~/Desktop, ~/Documents`
  - Default: `~/Downloads, ~/Desktop`
  - Supports home directory expansion (`~`)

### Commands

1. **Show Recent Files**: Main command to display recent files from configured directories
2. **Open Extension Preferences**: Quick access to configure target directories

## Usage

1. Open Raycast (Cmd+Space)
2. Type "Show Recent Files"
3. Browse through your recent files
   - Files are sorted by creation date (newest first)
   - Image files show automatic previews when selected
   - Use the search bar to filter files by name
4. When you reach the bottom of the list:
   - Select "Load More Files" and press Enter to load 20 more files
   - Press Cmd+A to load all remaining files

## Supported Image Formats

The extension provides automatic previews for:
- PNG, JPG, JPEG, GIF, SVG, WebP, BMP, ICO, TIFF

## Keyboard Shortcuts

| Action                    | Shortcut       |
|--------------------------|----------------|
| Copy file path           | Enter          |
| Open file                | Cmd+Enter      |
| Show in Finder           | Cmd+Shift+F    |
| Copy file name           | Cmd+Shift+C    |
| Open preferences         | Cmd+,          |
| Load all remaining files | Cmd+A          |

## Permissions

On macOS, you may need to grant Full Disk Access to Raycast to access certain directories:

1. Open System Preferences
2. Navigate to Security & Privacy > Privacy > Full Disk Access
3. Add Raycast to the list
4. Restart Raycast

If you encounter permission errors, the extension will provide helpful guidance and a link to Apple's support documentation.

## Features in Detail

### Multi-Directory Scanning
- Scans multiple directories in parallel
- Combines and sorts all files by creation date
- Handles errors gracefully - if one directory fails, others continue to work

### Performance Optimization
- Initial load of 30 files for fast startup
- Load more files on demand
- Hidden files (starting with `.`) are automatically excluded

### Detail Panel
- Image files: Full preview with centered display
- All files: Metadata showing name, location, size, and creation date
- Clean, minimal interface focused on the content

## Development

### Project Structure
```
raycast-recent-files/
├── src/
│   ├── index.tsx        # Main extension with file listing
│   └── preferences.tsx  # Preferences command
├── package.json         # Extension manifest and dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md           # Documentation
```

### Available Scripts
- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the extension for production
- `npm run lint` - Check code with ESLint
- `npm run fix-lint` - Auto-fix ESLint issues
- `npm run publish` - Publish to Raycast Store

## Troubleshooting

### "Permission denied" Error
- Grant Full Disk Access to Raycast in System Preferences
- Use the "Open Extension Preferences" command to change to accessible directories

### No Files Showing
- Ensure the directories exist and contain files
- Check that you have read permissions
- Hidden files (starting with `.`) are excluded by default

### Performance Issues
- Large directories may take time to scan
- Use the progressive loading feature instead of loading all files at once
- Consider targeting more specific subdirectories

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.