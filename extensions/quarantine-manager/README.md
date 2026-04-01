# Quarantine Manager

Inspect and manage extended attributes on macOS files and applications — without opening Terminal.

When you download an app outside the Mac App Store, macOS tags it with a `com.apple.quarantine` extended attribute. This triggers a Gatekeeper prompt on first launch: _"This app was downloaded from the internet. Are you sure you want to open it?"_

Developers and power users frequently need to check and clear this flag — for apps built locally, tools distributed via direct download, or utilities that Gatekeeper misidentifies. This extension gives you a fast, readable way to do that from Raycast.

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

## Tips

- **Select a file in Finder first** — if you already have a file selected, the command skips the picker entirely and loads it immediately
- **Protected files** — if the file requires elevated permissions, the extension will prompt for your admin password via a standard macOS dialog
- **The xattr command** — use "Copy xattr Command" to get the terminal equivalent if you prefer to run it manually or use it in a script

## Requirements

- macOS 12.0 or later
- Raycast 1.50.0 or later
- Raycast must have Automation permission for Finder: **System Settings → Privacy & Security → Automation**
