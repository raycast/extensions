# Windows Environment Variables

A keyboard-first alternative to the Windows Environment Variables dialog. Browse, search, edit, create, and delete Windows environment variables and PATH entries directly from Raycast.

## Features

- **List & Search** — View all User and System environment variables with instant search across names and values
- **Edit PATH** — Dedicated PATH editor with drag-to-reorder, existence validation, and duplicate detection
- **Add Variables** — Create new environment variables with scope selection (User or System)
- **Copy Actions** — Copy variable name, value, or `set` command format
- **Live Updates** — Broadcasts `WM_SETTINGCHANGE` after every modification so all running apps see changes immediately
- **Safety First** — Protected variable detection, confirmation dialogs for destructive actions, PATH backups before modifications

## Commands

| Command                    | Description                    | Shortcut |
| -------------------------- | ------------------------------ | -------- |
| List Environment Variables | Browse and manage all env vars | —        |
| Edit PATH Variable         | Dedicated PATH entry editor    | —        |
| Add Environment Variable   | Create a new variable          | —        |

## Keyboard Shortcuts

### List Environment Variables

| Action              | Shortcut |
| ------------------- | -------- |
| Copy Value          | ↵        |
| Copy Name           | ⌘⇧C      |
| Copy as SET         | ⌘⇧E      |
| Edit Variable       | ⌘E       |
| Edit in PATH Editor | ⌘P       |
| Open System Dialog  | ⌘O       |
| Add New Variable    | ⌘N       |
| Delete Variable     | ⌃X       |
| Refresh             | ⌘R       |

### Edit PATH Variable

| Action           | Shortcut |
| ---------------- | -------- |
| Copy Path        | ↵        |
| Open in Explorer | ⌘O       |
| Move Up          | ⌘↑       |
| Move Down        | ⌘↓       |
| Add New Entry    | ⌘N       |
| Remove Entry     | ⌃X       |
| Refresh          | ⌘R       |

## Permissions

- **User variables**: No special permissions required
- **System variables**: Requires administrator elevation (UAC prompt will appear)

## Safety

- Protected system variables (PATH, COMSPEC, SYSTEMROOT, etc.) cannot be deleted
- Variables matching sensitive patterns (KEY, TOKEN, SECRET, etc.) are partially masked in the detail view
- PATH is backed up to local storage before each modification
- All destructive actions require confirmation
- PowerShell commands use `-EncodedCommand` (base64 UTF-16LE) to prevent injection

## Platform

Windows only. Requires PowerShell (included with Windows).
