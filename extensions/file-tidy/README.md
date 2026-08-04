# File Tidy

Organize messy folders in seconds: files are archived into `Type/Year-Month` buckets, byte-identical duplicates are quarantined instead of archived twice, and everything can be undone in one step.

## Commands

### Tidy Folder

Pick a folder (Downloads, Desktop, a memory-card dump…) and get a full preview of the plan before anything moves:

- Files are grouped into `Images`, `Videos`, `Audios`, `Documents`, `Archives` (or a fallback category) by extension, then into `Year-Month` folders.
- Photos and videos use their **EXIF capture date** when available; other files use the earlier of creation/modification time.
- **Duplicate detection is byte-level and filename-independent** (size → head/tail hash → full SHA-256). Duplicates — including files identical to something already archived in the destination — go to a `Duplicates` folder with a manifest explaining what they matched.
- Optional **in-place mode** creates the category folders inside the source folder itself, and **Include subfolders** recurses into nested folders.

Nothing is moved until you confirm the plan.

### Undo Last Tidy

Moves every file from the most recent run back to its original location and removes the folders that were created. Each run writes a manifest under `.tidy/runs` in the destination, so undo is always exact.

## Preferences

- **Default Destination**: used when you don't pick a destination in the form.

## Customization

Category-to-extension mappings live in a shared config file (`~/.config/tidy/config.json` on macOS/Linux, `%APPDATA%\tidy\config.json` on Windows), created with sensible defaults on first run. Edit it to add categories or extensions.
