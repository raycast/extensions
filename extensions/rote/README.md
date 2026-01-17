# Rote for Raycast

[中文文档](./README.zh-CN.md)

A Raycast extension for [Rote](https://github.com/Rabithua/Rote) - quickly create, search, and manage your fleeting thoughts.

## Features

- 🔍 **Search Notes** - Full-text search with detail panel preview
- 📋 **List Notes** - Browse notes with time/status/tag filters
- 📝 **Create Note** - Create notes with tags and visibility settings
- ⚡ **Quick Add** - Instantly save selected text or clipboard as a note
- ⚙️ **Config Quick Add** - Select default tags from existing tags
- 🎲 **Random Note** - Review a random note from your collection

## Screenshots

### Overview
![Raycast Overview](./assets/shot-raycast.png)

### List Notes
Browse and manage your notes with powerful filtering options.

![List Notes](./assets/shot-list-note.png)

### Create Note
Create notes with tags and visibility settings.

![Create Note](./assets/shot-create-note.png)

### Quick Add
Instantly save selected text or clipboard content as a note.

![Quick Add - Selection](./assets/gif-quick-add-selection.gif)

![Quick Add - Copy](./assets/gif-quick-add-copy.gif)

### Config Quick Add
Configure default tags for Quick Add command.

![Config Quick Add](./assets/shot-config-quick-add.png)

### Random Note
Review a random note from your collection.

![Random Note](./assets/shot-random-note.png)

## Installation

### From Source

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/rote-raycast.git
cd rote-raycast
```

2. **Enable Developer Mode**
   - Open Raycast
   - Press `⌘ ,` to open settings
   - Go to the `Advanced` tab
   - Check `Developer Mode`

3. **Import the extension**
   - Open Raycast using the shortcut key
   - Type `Import Extension`
   - Select the folder containing the extension (the directory with `package.json`)
   - Confirm the import

4. **Install dependencies**
   - After importing the extension, Raycast will automatically install the required dependencies
   - If you need to install them manually, navigate to the extension directory and run `npm install`

### Development Mode

For development with hot reload:

```bash
npm run dev
```

Then import the extension to Raycast as described above.

## Setup

1. Install the extension
2. Open Raycast Preferences → Extensions → Rote
3. Configure the following settings:

| Setting | Required | Description |
|---------|----------|-------------|
| **API Endpoint** | Yes | Your Rote backend URL (e.g., `https://rote-backend.example.com`) |
| **Web URL** | No | Your Rote frontend URL for opening notes in browser |
| **Username** | Yes | Your Rote username or email |
| **Password** | Yes | Your Rote password |

> **Note:** Both username and email login are supported. The extension automatically detects the format.

## Commands

### Search Notes
Search your notes with real-time results. Features a detail panel showing full content, images, and metadata.

**Shortcuts:**
- `Cmd+O` - Open in browser
- `Cmd+C` - Copy content
- `Cmd+Shift+C` - Copy link
- `Cmd+Shift+V` - Paste content

### List Notes
Browse your notes with powerful filtering:

**Time Filters:**
- All Notes
- Today
- Yesterday
- Last 7 Days
- Last 30 Days

**Status Filters:**
- Public
- Private
- Pinned

**Tag Filters:**
- Filter by any tag from your notes

**Shortcuts:**
- `Cmd+E` - Edit note
- `Cmd+D` - Delete note
- `Cmd+O` - Open in browser
- `Cmd+C` - Copy content
- `Cmd+Shift+C` - Copy link
- `Cmd+Shift+V` - Paste content
- `Cmd+R` - Refresh list

### Create Note
Create notes with:
- Content (Markdown supported)
- Tags (comma or space separated)
- Visibility (Private/Public)

### Quick Add Note
No-view command that instantly creates a note from:
1. Selected text (priority)
2. Clipboard content (fallback)

Use **Config Quick Add** command to select default tags (recommended).

### Config Quick Add
Select default tags for Quick Add from your existing tags:
- Browse and select from existing tags
- Create new tags by typing
- Prevents typos and ensures tag consistency

### Random Note
Display a random note for review.

**Shortcuts:**
- `Cmd+R` - Another random note
- `Cmd+O` - Open in browser

## Development

```bash
npm install      # Install dependencies
npm run dev      # Development mode
npm run build    # Build for production
npm run lint     # Lint code
```

## License

MIT
