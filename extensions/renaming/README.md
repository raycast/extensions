# Renaming

A powerful batch file renaming tool for Raycast with regex support, case transformation, undo history, and presets.

## Features

### Rename File(s) / Rename Folder(s)
Batch rename files or folders with customizable options:
- **Prefix & Suffix**: Add text before or after filenames
- **Case Transformation**: Convert to UPPERCASE, lowercase, Title Case, camelCase, PascalCase, snake_case, or kebab-case
- **Sequential Numbering**: Auto-number files with configurable start, increment, and zero-padding
- **Preserve Name Mode**: Keep original filenames while adding prefix/suffix

### Replace in File Names / Replace in Folder Names
Find and replace text in filenames:
- **Simple Mode**: Replace exact text matches
- **Regex Mode**: Use regular expressions for advanced pattern matching
- Live preview shows all changes before applying

### Rename from Clipboard
Use names copied to your clipboard to rename selected files. Supports newline, tab, and comma-delimited formats.

### AI Smart Rename
Generate descriptive filenames using Raycast AI based on file content and metadata. Supports images, videos, audio, documents, and code files. Requires Raycast Pro.

### Rename History
Track and undo your changes:
- View all recent rename operations
- Undo single operations or multiple at once
- Clear history when no longer needed

### Presets
Save and reuse rename configurations:
- Create custom presets with your preferred settings
- Use built-in default presets for common operations
- Quickly apply saved configurations

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘Z | Undo last rename operation |
| ⌘R | Refresh file list or history |
| ⌘⇧⌫ | Clear all history |

## Usage

1. Select files or folders in Finder
2. Open Raycast and search for "Renaming"
3. Choose a command from the hub menu
4. Configure your rename options
5. Preview the changes and submit to apply

All operations can be undone using ⌘Z or through the Rename History command.

## Safety Features

- **Conflict Detection**: Warns before creating duplicate filenames
- **No Overwriting**: Refuses to overwrite existing files
- **Undo History**: All operations are tracked and reversible
- **Confirmation Dialogs**: Asks before batch operations
- **Validation**: Prevents invalid characters in filenames

## Examples

### Batch rename photos
1. Select photos in Finder
2. Open "Rename File(s)"
3. Enter base name: `vacation`
4. Set separator: `_`
5. Result: `vacation_1.jpg`, `vacation_2.jpg`, etc.

### Clean up filenames
1. Select files with spaces
2. Open "Replace in File Names"
3. Find: ` ` (space)
4. Replace with: `_`
5. Result: Spaces replaced with underscores

### Convert to lowercase
1. Select files
2. Open "Rename File(s)"
3. Enable "Preserve Name Mode"
4. Set Case Style: `lowercase`
5. Result: All filenames converted to lowercase
