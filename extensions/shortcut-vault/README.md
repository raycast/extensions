# Shortcut Vault

**Shortcut Vault** is a local-first Raycast extension for searching, saving, managing, importing, and exporting keyboard shortcuts for macOS applications and webapps.

It comes pre-loaded with **530 default shortcuts** across 18 popular applications and webapps, while providing a personal vault for your custom shortcuts.

---

## Features

- ⚡ **Instant Search**: Search bundled default shortcuts and personal custom shortcuts together with zero latency.
- 🎯 **Filter Dropdown**: Filter results directly in the search bar by **Source** (Default, Custom), **Scope** (Global, App, Webapp), or **Owner App**.
- 🔍 **Smart Symbol & Key Matching**: Search by modifier aliases (`cmd`, `opt`, `ctrl`, `shift`), key names (`right`, `escape`, `return`, `space`, `+`), or action names (`new tab`, `format code`).
- ➕ **Add Custom Shortcuts**: Save shortcuts with modifier pickers, live display preview, owner canonicalization, and duplicate detection.
- ✏️ **Manage Shortcuts**: Edit, duplicate (`⌘D`), or delete (`⌘Backspace`) custom shortcuts.
- 📋 **One-Tap Actions**: Press `Enter` to copy shortcut keys immediately. Copy full summaries or command names with action panel options.
- 📦 **Import & Export**: Backup and transfer custom shortcuts using a clean, versioned JSON format.
- 🔒 **Local-First & Private**: Runs 100% locally with Raycast `LocalStorage`. No accounts, telemetry, tracking, or background network requests.

---

## Bundled Shortcut Library

Shortcut Vault includes verified default shortcut databases for 18 popular macOS applications and webapps:

- **macOS System & Apps**: macOS, Finder, Safari, Calendar, Mail, Notes, Reminders, App Store, Freeform, Terminal, Xcode.
- **Developer & Productivity Tools**: Raycast, VS Code, Slack, Notion, Chrome, Figma, Gmail.

---

## Commands

### Search Shortcuts
The primary search experience. Combines bundled default shortcuts and your custom shortcuts into a unified list.
- Press **Enter** on any result to copy the shortcut keys immediately.
- Use the filter dropdown (`Accessory`) to narrow by owner, scope, or source.

### Search Default Shortcuts
Search only the bundled database of 530+ shortcuts.

### Search Custom Shortcuts
Search only shortcuts created or imported by you.

### Add Shortcut
Save a new custom shortcut with:
- Command name
- Interactive modifier selectors (`⌘`, `⌥`, `⌃`, `⇧`, `fn`)
- Key name
- Owner App / Webapp (defaults to *General* if left blank)
- Scope (*Global*, *App*, *Webapp*)
- Context notes

### Manage Custom Shortcuts
View and manage your saved shortcuts with quick actions:
- **Edit**: Modify shortcut details.
- **Duplicate (`⌘D`)**: Create a copy of an existing shortcut.
- **Delete (`⌘Backspace`)**: Remove a shortcut with confirmation.

### Export Shortcuts
Export custom shortcuts to a versioned JSON file under Raycast support storage or copy the JSON payload directly to your clipboard.

### Import Shortcuts
Import custom shortcuts from a Shortcut Vault JSON file. Validates format, version, and required fields before saving.

---

## Import / Export JSON Format

Custom shortcuts are exported and imported using a clean JSON envelope:

```json
{
  "format": "shortcut-vault",
  "version": 1,
  "exportedAt": "2026-07-28T00:00:00.000Z",
  "shortcuts": [
    {
      "id": "example-custom-shortcut",
      "commandName": "Open Command Menu",
      "modifiers": ["command", "shift"],
      "key": "P",
      "shortcutDisplay": "⌘ + ⇧ + P",
      "ownerName": "VS Code",
      "ownerType": "mac-app",
      "scope": "app",
      "notes": "Example custom shortcut.",
      "sourceType": "custom",
      "createdAt": "2026-07-28T00:00:00.000Z",
      "updatedAt": "2026-07-28T00:00:00.000Z"
    }
  ]
}
```

---

## Privacy & Local Storage

All custom shortcuts are stored on your Mac using Raycast `LocalStorage`.

Shortcut Vault performs no automatic network calls, telemetry, or remote data sync.

---

## Development & Contribution

### Local Setup

```bash
# Install dependencies
npm install

# Run development mode in Raycast
npm run dev
```

### Verification & Build

```bash
# Validate dataset JSON files
npm run validate-data

# Typecheck TypeScript
npm run typecheck

# Run unit tests
npm run test

# Lint & format check
npm run lint

# Build extension dist
npm run build

# Run complete verification pipeline
npm run verify
```

---

## License

[MIT](LICENSE) © Hyder
