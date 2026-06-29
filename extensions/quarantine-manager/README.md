# Quarantine Manager

<img src="assets/extension-icon.png" width="64" align="right" alt="Quarantine Manager icon">

A [Raycast](https://raycast.com) extension to inspect and manage extended attributes on macOS files and apps — without opening Terminal.

When you download an app outside the Mac App Store, macOS tags it with a `com.apple.quarantine` extended attribute. This triggers a Gatekeeper prompt on first launch: _"This app was downloaded from the internet. Are you sure you want to open it?"_

Developers and power users frequently need to check and clear this flag — for apps built locally, tools distributed via direct download, or utilities that Gatekeeper misidentifies. This extension gives you a fast, readable way to do that from Raycast.

<a title="Install quarantine-manager Raycast Extension" href="https://www.raycast.com/nurkamol/quarantine-manager"><img src="https://www.raycast.com/nurkamol/quarantine-manager/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt=""></a>

---

## Command

### Manage Quarantine

A single command that does it all. Opens a file picker (or uses your current Finder selection — including **multiple** items at once), scans the targets, and lets you inspect **and** clear quarantine from the same place — no switching commands. The picker remembers your **last selection**, so re-checking the same folder is one keystroke (`⌘R`).

**What it shows:**

- Quarantine status (quarantined / clean) with color-coded badge
- Parsed quarantine data: download source app + timestamp + flags
- All extended attributes with raw and parsed values — tap any attribute to see its full value
- File metadata: size, type, last modified, path

**Actions available via ⌘K:**

- **Remove Quarantine** — removes `com.apple.quarantine` (prompts for admin if needed)
- **Remove All Attributes** — clears all xattr data on the file
- **Select Different File** `⌘O` — pick another file without relaunching
- **Copy File Path** `⌘⇧C`
- **Copy Remove Command** `⌘⇧X` — copies the terminal equivalent to clipboard

### Apps & folders — select & batch-remove

Point it at one or more directories/apps (or a mix of files and folders) and you get an uninstaller-style checklist:

- **Apps (`.app`)** are scanned **recursively** — bundles often hold many internal quarantined files, and each one is listed.
- **Plain folders** are scanned **one level deep** (immediate contents only), so large directories like Downloads stay fast.
- **Select several apps at once** and they're scanned together into a single list.

Every quarantined item is shown as a **selectable row** (all selected by default). Toggle individual files with `⌘↵`, **Select All** `⌘⇧A` / **Deselect All** `⌘⇧D`, sort by path / source / date, then press **Enter** on **Remove Quarantine from Selected** to clear exactly the files you picked. The whole selection is cleared in **one pass with at most one admin prompt** — no per-app password dialogs. The section header tracks `N of M selected`.

---

## Tips

- **Select files in Finder first** — if you already have one or more items selected, the command skips the picker entirely and scans them immediately
- **Protected files** — if the file requires elevated permissions, the extension will prompt for your admin password via a standard macOS dialog
- **The xattr command** — use "Copy Remove Command" to get the terminal equivalent if you prefer to run it manually or use it in a script

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
