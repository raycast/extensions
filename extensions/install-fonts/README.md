# Install Fonts

Install Fonts is a Raycast extension that installs fonts from a Finder selection.

## What it does

- Installs `.ttf`, `.otf`, `.ttc`, and `.otc` files into `~/Library/Fonts`
- Accepts a single font file, a folder of fonts, or a `.zip` archive
- Can trash the original source after a successful install
- Lets you choose how to handle duplicate font filenames
- Prompts you to pick a format when both OTF and TTF (or other mixed formats) are found in the selection
- Shows a summary after install

## How to use

1. Select one or more font files, a folder, or a zip archive in Finder.
2. Open Raycast.
3. Run `Install Fonts`.

## Preferences

- **Trash source after install** — Move the original font file, folder, or zip to the Trash after a successful install.
- **Duplicate handling** — Ask every time, skip duplicates, overwrite duplicates, or keep both.
- **Show Fonts folder after install** — Reveal your user Fonts folder in Finder after a successful install.
- **Font versions** — Install all discovered fonts, or ask when mixed formats (for example OTF and TTF) are found.

## Notes

- The command reads the active Finder selection directly.
- Zip archives are extracted to a temporary directory before installation.
