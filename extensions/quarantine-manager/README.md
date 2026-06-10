# Quarantine Manager

<img src="assets/extension-icon.png" width="64" align="right" alt="Quarantine Manager icon">

A [Raycast](https://raycast.com) extension to inspect and manage extended attributes on macOS files and apps — without opening Terminal.

When you download an app outside the Mac App Store, macOS tags it with a `com.apple.quarantine` extended attribute. This triggers a Gatekeeper prompt on first launch: _"This app was downloaded from the internet. Are you sure you want to open it?"_

Developers and power users frequently need to check and clear this flag — for apps built locally, tools distributed via direct download, or utilities that Gatekeeper misidentifies. This extension gives you a fast, readable way to do that from Raycast.

<a title="Install quarantine-manager Raycast Extension" href="https://www.raycast.com/nurkamol/quarantine-manager"><img src="https://www.raycast.com/nurkamol/quarantine-manager/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt=""></a>

---

## Commands

### Remove Quarantine

Opens a file picker (or uses your current Finder selection), then shows a full breakdown of the file's quarantine status and extended attributes. From there you can remove the quarantine flag in one action.

**What it shows:**

- Quarantine status (quarantined / clean) with color-coded badge
- Parsed quarantine data: download source app + timestamp + flags
- All extended attributes with raw and parsed values
- File metadata: size, type, last modified, path

**Actions available via ⌘K:**

- **Remove Quarantine** — removes `com.apple.quarantine` (prompts for admin if needed)
- **Remove All Attributes** — clears all xattr data on the file
- **Select Different File** `⌘O` — pick another file without relaunching
- **Copy File Path** `⌘⇧C`
- **Copy Xattr Command** `⌘⇧X` — copies the terminal equivalent to clipboard

### Check Quarantine Status

Lists every extended attribute on a file in a searchable list view. Tap any attribute to see its full value — useful for understanding exactly what metadata macOS has attached to a file.

### Apps & folders

Both commands also accept directories:

- **Apps (`.app`)** are scanned **recursively** — bundles often hold many internal quarantined files, and you'll see each one listed (and can clear them all at once).
- **Plain folders** are scanned **one level deep** (immediate contents only), so large directories like Downloads stay fast.

When removing on a directory, the extension runs the recursive `xattr -dr` after a confirmation that tells you how many items are affected.

---

## Tips

- **Select a file in Finder first** — if you already have a file selected, the command skips the picker entirely and loads it immediately
- **Protected files** — if the file requires elevated permissions, the extension will prompt for your admin password via a standard macOS dialog
- **The xattr command** — use "Copy Xattr Command" to get the terminal equivalent if you prefer to run it manually or use it in a script

---

## Requirements

- macOS 12.0 or later
- [Raycast](https://raycast.com) 1.50.0 or later
- Raycast must have Automation permission for Finder: **System Settings → Privacy & Security → Automation**

---

## Installation

Install directly from the [Raycast Store](https://www.raycast.com/nurkamol/quarantine-manager).

Or clone and run locally:

```bash
git clone https://github.com/nurkamol/quarantine-manager
cd quarantine-manager
npm install
npm run dev
```

---

## License

MIT
