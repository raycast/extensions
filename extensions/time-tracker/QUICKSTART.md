# Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Icon (Required)

Download or create a `command-icon.png` (512x512px) and place it at the project root.
See [ASSETS.md](ASSETS.md) for details.

Quick solution using SF Symbols:
```bash
# Open SF Symbols app → Search "clock" → Export as PNG → Rename to command-icon.png
```

### 3. Start Development Mode

```bash
npm run dev
```

This will:
- Build the extension in watch mode
- Install it in Raycast
- Auto-reload on file changes

### 4. Configure Google Drive Path (Optional)

By default, data is stored in `~/Google Drive/TimeTrack/data.json`

If your Google Drive is in a different location, update the path in [src/utils/storage.ts](src/utils/storage.ts:17):

```typescript
function getDataFilePath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, "Google Drive", "TimeTrack", "data.json");
}
```

Common alternatives:
- `"GoogleDrive"` (no space)
- `"Google Drive/My Drive"`
- Custom path like `"Documents/TimeTrack"`

## First Use

### 1. Create Your First Project

1. Open Raycast (Cmd+Space)
2. Type "Manage Projects"
3. Press "Cmd+N" to create a project
4. Enter name (e.g., "My Project") and pick a color
5. Press Enter

### 2. Log Your First Time Entry

1. Open Raycast
2. Type "Log Time"
3. Select your project
4. Enter duration: `2h30` or `2.5` or `2:30`
5. Add a comment (optional)
6. Press Enter

### 3. View Your Entries

1. Open Raycast
2. Type "View Time Entries"
3. Browse, filter, edit, or delete entries

## Tips

### Duration Formats

All these formats work:
- `2.5` → 2.5 hours
- `2h30` → 2.5 hours
- `2:30` → 2.5 hours
- `30m` → 0.5 hours
- `2h` → 2 hours

### Keyboard Shortcuts

In Raycast settings, you can assign global hotkeys:
- Log Time: e.g., `Opt+Cmd+L`
- View Entries: e.g., `Opt+Cmd+V`

This lets you log time from any app without opening Raycast search first.

### Smart Defaults

- **Project**: Automatically selects your last used project
- **Date**: Defaults to today
- **Focus**: Cursor starts in duration field for instant typing

### Workflow Example

Daily routine:
1. Press your hotkey (e.g., `Opt+Cmd+L`)
2. Type duration: `2h30`
3. Press Tab → Enter comment: "Client meeting"
4. Press Enter

Total time: ~3 seconds ⚡

## Troubleshooting

### "Command not found"

Make sure you ran `npm run dev` and Raycast detected the extension.

### "Failed to load projects"

Check that the Google Drive path exists:
```bash
ls -la ~/Google\ Drive/TimeTrack/
```

If not, the extension will create it automatically on first use.

### Changes not reflected

1. Make sure `npm run dev` is running
2. In Raycast, reload the extension: Open Raycast → Extensions → Your Extension → Cmd+R

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [TODO.md](TODO.md) for planned features
- Customize keyboard shortcuts in Raycast preferences
- Set up global hotkeys for instant access
