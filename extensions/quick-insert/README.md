# Quick Insert

> Quickly insert common data like dates, clipboard content, system info, and favorite text snippets

A Raycast extension that helps you boost productivity by providing quick access to frequently used data.

## Features

### 🗓️ Insert Date
Insert current date with multiple format options:
- **ISO 8601**: `2025-12-03`
- **Full**: `December 3, 2025`
- **Short**: `12/03/2025`
- **Vietnamese**: `03 tháng 12 năm 2025`
- **Custom**: Use date-fns patterns like `dd-MM-yyyy HH:mm:ss`

### 📅 Insert Year
Insert current year in full (2025) or short (25) format.

### 📋 Insert Clipboard
Transform and insert clipboard content with:
- **Transformations**: UPPERCASE, lowercase, Title Case, Trim
- **Prefix/Suffix**: Add text before/after clipboard content
- Example: Transform `hello world` → `"Hello World"` with Title Case + quotes

### 💻 Insert System Info
Insert system information:
- OS name & version
- Username
- Hostname
- Local IP address
- All info combined

### 🆔 Insert ID
Generate and insert unique identifiers:
- **UUID (v4)**: Standard UUID format `550e8400-e29b-41d4-a716-446655440000`
- **ULID**: Universally Unique Lexicographically Sortable Identifier
- **NanoID**: URL-friendly unique ID (21 chars)
- **NanoID Short**: Compact version (10 chars)

### 🌐 Insert IP Address
Insert IP addresses:
- **Local IP**: Your machine's local network IP
- **Public IP**: Your public internet IP (fetched from api.ipify.org)
- **Both**: Display both local and public IPs

### ⭐ Insert Snippet
Manage and insert your favorite text snippets with:
- **CRUD operations**: Create, Read, Update, Delete
- **Search & Filter**: Quickly find snippets
- **Template Variables**: Use `{{date}}`, `{{year}}`, `{{clipboard}}`, `{{username}}`, `{{hostname}}`
- **Categories & Tags**: Organize your snippets
- **Keyboard Shortcuts**: ⌘⌫ to delete

## Installation

### Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Import the extension in Raycast:
   - Open Raycast
   - Type "Import Extension"
   - Select the `quick-insert` folder

## Usage

### Insert Date
1. Open Raycast (⌘ Space)
2. Type "Insert Date"
3. Select format from dropdown (or press Enter for ISO format)
4. For custom format, select "Custom" and enter pattern (e.g., `dd-MM-yyyy`)
5. Date will be inserted at cursor position

### Insert Year
1. Open Raycast
2. Type "Insert Year"
3. Select Full or Short format
4. Year will be inserted at cursor position

### Insert Clipboard
1. Copy some text to clipboard
2. Open Raycast
3. Type "Insert Clipboard"
4. Select transformation (optional)
5. Add prefix/suffix (optional)
6. Transformed text will be inserted

### Insert System Info
1. Open Raycast
2. Type "Insert System Info"
3. Select info type (OS, Username, Hostname, Local IP, or All)
4. Info will be inserted at cursor position

### Insert ID
1. Open Raycast
2. Type "Insert ID"
3. Select ID type:
   - UUID (v4) - Standard UUID
   - ULID - Sortable unique ID
   - NanoID - URL-friendly (21 chars)
   - NanoID Short - Compact (10 chars)
4. ID will be inserted at cursor position

### Insert IP Address
1. Open Raycast
2. Type "Insert IP Address"
3. Select IP type:
   - Local IP - Your local network IP
   - Public IP - Your public internet IP (requires internet)
   - Both - Display both IPs
4. IP will be inserted at cursor position

### Insert Snippet
1. Open Raycast
2. Type "Insert Snippet"
3. **To create**: Click "➕ Create New Snippet"
   - Enter name, content, category, tags
   - Use template variables: `{{date}}`, `{{year}}`, `{{clipboard}}`, etc.
   - Submit to save
4. **To insert**: Select snippet from list and press Enter
5. **To edit**: Select snippet → Press ⌘E
6. **To delete**: Select snippet → Press ⌘⌫

## Template Variables

Use these variables in your snippets:
- `{{date}}` - Current date (ISO format)
- `{{year}}` - Current year
- `{{clipboard}}` - Current clipboard content
- `{{username}}` - System username
- `{{hostname}}` - System hostname

**Example Snippet**:
```
Name: Meeting Notes
Content:
# Meeting - {{date}}

Attendees:
- {{clipboard}}

Notes:
- 

Action Items:
- 
```

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
npm run fix-lint  # Auto-fix issues
```

### Project Structure
```
src/
├── types.ts              # Data models
├── utils/
│   ├── paste.ts          # Paste utility
│   ├── storage.ts        # LocalStorage CRUD
│   └── template.ts       # Template engine
├── insert-date.tsx       # Date command
├── insert-year.tsx       # Year command
├── insert-clipboard.tsx  # Clipboard command
├── insert-system-info.tsx # System info command
├── insert-snippet.tsx    # Snippet list view
├── create-snippet.tsx    # Create snippet form
└── edit-snippet.tsx      # Edit snippet form
```

## Dependencies

- `@raycast/api` - Core Raycast API
- `@raycast/utils` - Utility functions
- `date-fns` - Date formatting
- `nanoid` - NanoID generation
- `ulid` - ULID generation

## License

MIT

## Author

Update `author` field in `package.json` with your Raycast username before publishing.

