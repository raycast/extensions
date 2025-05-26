# Slugify File / Folder Names - Raycast Extension

A Raycast extension that converts selected files and folders in Finder to URL-friendly slug format with comprehensive international character support.

## Features

- 🌍 **International Characters**: Handles accented and special characters from multiple languages
- 📁 **Batch Processing**: Rename multiple files and folders at once
- 🔄 **Extension Preservation**: Keeps file extensions intact
- ⚡ **Conflict Resolution**: Automatically handles filename conflicts
- 📋 **Rename Log**: Copies a summary of renamed items to clipboard

## Character Mappings

### International Characters
- **á à â ä æ ã å ā** → a
- **é è ê ë ē ė ę** → e
- **í ì î ï ī į ı İ** → i
- **ó ò ô ö œ õ ø ō** → o
- **ú ù û ü ū** → u
- **ç** → c
- **ğ** → g
- **ş** → s
- **ñ** → n
- **ß** → ss
- **ý** → y
- **ž** → z

### Special Character Rules
- Spaces and separators (`/`, `\`, `_`) → `-`
- Punctuation (`,`, `.`, `!`, `?`, `:`, `;`) → removed
- Symbols (`@`, `#`, `$`, `%`, `^`, `&`, `*`, `+`, `=`, `~`) → removed
- Quotes (`"`, `'`, `` ` ``) → removed
- Parentheses and brackets → removed
- Multiple hyphens → single hyphen
- Leading/trailing hyphens → removed

## Usage

1. **Select Files/Folders**: In Finder, select one or more files or folders you want to rename
2. **Run Command**: Open Raycast and type "Slugify Selected Files & Folders" or use the configured shortcut
3. **View Results**: The extension will:
   - Show progress toast during processing
   - Display success/failure summary
   - Copy rename log to clipboard (format: `original-name → new-name`)

## Examples

| Original Name | Slugified Name |
|---------------|----------------|
| `Çılgın %50 İndirim! (Şimdi Başla)` | `cilgin-50-indirim-simdi-basla` |
| `café résumé.pdf` | `cafe-resume.pdf` |
| `My File (copy).txt` | `my-file-copy.txt` |
| `naïve piñata.docx` | `naive-pinata.docx` |
| `Hello World!` | `hello-world` |

## Error Handling

- **No Selection**: Shows error if no files/folders are selected in Finder
- **Permission Issues**: Displays specific error messages for access problems
- **Naming Conflicts**: Automatically appends numbers (`-1`, `-2`, etc.) to avoid overwrites
- **Already Slugified**: Skips files that are already in slug format

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
The extension includes comprehensive test cases for the slugify function covering:
- International character mappings
- Special character handling
- Edge cases and file extensions

## Technical Details

- **Framework**: Raycast API
- **Language**: TypeScript
- **File Operations**: Node.js `fs.promises`
- **Mode**: No-view command for quick execution

## Changelog

## [Initial Version] - {PR_MERGE_DATE}
- Initial release
- International character support
- Batch file processing
- Extension preservation
- Conflict resolution
- Clipboard integration