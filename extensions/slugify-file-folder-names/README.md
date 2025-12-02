# Slugify File / Folder Names - Raycast Extension

A Raycast extension that converts selected files and folders in Finder to URL-friendly slug format with comprehensive international character support.

## Features

- **International Characters**: Handles accented and special characters from multiple languages
- **Transliterate German Umlauts**: Optional proper transliteration of German umlauts (ä→ae, ö→oe, ü→ue, ß→ss)
- **Batch Processing**: Rename multiple files and folders at once
- **Extension Preservation**: Keeps file extensions intact
- **Conflict Resolution**: Automatically handles filename conflicts
- **Rename Log**: Copies a summary of renamed items to clipboard
- **Configurable**: Customizable preferences via Raycast settings

## Preferences

Access preferences by pressing `⌘,` (Command + Comma) when selecting the command, or via Raycast Settings > Extensions > Slugify File / Folder Names.

### Transliterate German Umlauts
- **Enable German umlaut translation**: When enabled, German umlauts are properly transliterated instead of simplified
- **Default**: Disabled (maintains backward compatibility)
- **Examples**:
  - **Disabled**: `Müller.txt` → `muller.txt`
  - **Enabled**: `Müller.txt` → `mueller.txt`

## Character Mappings

### German Characters (when German Umlaut Transliteration is enabled)
- **ä** → ae
- **ö** → oe  
- **ü** → ue
- **Ä** → Ae
- **Ö** → Oe
- **Ü** → Ue
- **ß** → ss

### International Characters (default behavior)
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

1. **Configure Preferences** (optional): Set German umlaut transliteration preference via command preferences (`⌘,`)
2. **Select Files/Folders**: In Finder, select one or more files or folders you want to rename
3. **Run Command**: Open Raycast and type "Slugify Selected Files & Folders" or use the configured shortcut
4. **View Results**: The extension will:
   - Show progress toast during processing
   - Display success/failure summary
   - Copy rename log to clipboard (format: `original-name → new-name`)

## Examples

### Standard Examples
| Original Name | Slugified Name |
|---------------|----------------|
| `Çılgın %50 İndirim! (Şimdi Başla)` | `cilgin-50-indirim-simdi-basla` |
| `café résumé.pdf` | `cafe-resume.pdf` |
| `My File (copy).txt` | `my-file-copy.txt` |
| `naïve piñata.docx` | `naive-pinata.docx` |
| `Hello World!` | `hello-world` |

### German Umlaut Transliteration Examples
| Original Name | Default Behavior | German Umlauts Transliterated |
|---------------|------------------|---------------------------|
| `Müller.txt` | `muller.txt` | `mueller.txt` |
| `Größe.pdf` | `grosse.pdf` | `groesse.pdf` |
| `Bär Höhle.jpg` | `bar-hohle.jpg` | `baer-hoehle.jpg` |
| `Tür Öffnung.docx` | `tur-offnung.docx` | `tuer-oeffnung.docx` |
| `Köln Düsseldorf.txt` | `koln-dusseldorf.txt` | `koeln-duesseldorf.txt` |

## Error Handling

- **No Selection**: Shows error if no files/folders are selected in Finder
- **Permission Issues**: Displays specific error messages for access problems
- **Naming Conflicts**: Automatically appends numbers (`-1`, `-2`, etc.) to avoid overwrites
- **Already Slugified**: Skips files that are already in slug format


## Technical Details

- **Framework**: Raycast API
- **Language**: TypeScript
- **File Operations**: Node.js `fs.promises`
- **Mode**: No-view command for quick execution
- **Preferences**: Raycast Preferences API for persistent settings
