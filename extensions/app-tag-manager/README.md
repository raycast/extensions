# App Tag Manager

Organize and search your macOS applications with custom tags. A powerful Raycast extension that makes app discovery instant and intuitive.

[中文版本](README.zh.md)

## Features

### 🏷️ Smart Tagging System
- **Custom Tags**: Add unlimited tags to any application
- **Instant Search**: Find apps by name, tag, or even Chinese/Pinyin
- **Bulk Management**: Manage all your tags in one place

### 🔍 Advanced Search
- **Multi-language Support**: Search in English, Chinese, and Pinyin
- **Tag-based Filtering**: Quickly filter apps by their tags
- **Progressive Loading**: Fast initial load with async name updates

### 📤 Import/Export
- **Backup Tags**: Export all your tag configurations as JSON
- **Sync Across Devices**: Import tags on a new Mac or share with teammates
- **AI Enhancement**: Use the included AI prompt to auto-generate tags

## Installation

1. Install [Raycast](https://raycast.com)
2. Search for "App Tag Manager" in the Raycast Store
3. Click Install

## Usage

### Search and Tag Apps

Use the main command to search and manage tags:

1. Press `⌘ Space` to open Raycast
2. Type "App Tags Search"
3. Search for any application
4. Press `Enter` to manage tags for the selected app

### Tag Management Interface

The new List-based tag editor provides a streamlined experience:

- **Add Tags**: Type a new tag name and press `Enter`
- **Remove Tags**: Select an existing tag and press `Enter`
- **Filter Tags**: Start typing to filter existing tags

### Export Tags

1. Run "App Tags Export" command
2. View your tag statistics
3. Click "Export to Clipboard"
4. Optionally copy the AI prompt for auto-tagging

### Import Tags

1. Copy exported JSON data to clipboard
2. Run "App Tags Import" command
3. Review the import preview
4. Click "Import Tags" to apply

## AI Auto-Tagging

The extension includes a carefully crafted prompt for AI assistants to automatically generate relevant tags for your applications. After exporting your tags:

1. Copy the AI prompt from the export page
2. Paste it along with your exported JSON to an AI assistant
3. Import the enhanced JSON back into the extension

## Tips

- **Quick Access**: Assign keyboard shortcuts to frequently used commands
- **Consistent Tagging**: Use categories like "Development", "Design", "Productivity"
- **Tag Groups**: Create tag hierarchies like "Work/Meeting", "Work/Code"
- **Regular Backups**: Export your tags periodically to prevent data loss

## Privacy

All data is stored locally on your Mac using Raycast's LocalStorage. No data is sent to external servers.

## Requirements

- macOS 10.15+
- Raycast v1.50.0+

## Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/Deepoke/app-tag-manager).

## Author

**Deepoke**

## License

MIT License - see [LICENSE](LICENSE) for details

---

Made with ❤️ for the Raycast community