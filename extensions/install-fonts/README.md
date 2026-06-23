# Install Fonts

Install Fonts is a Raycast extension that installs fonts from a Finder selection.

## What it does

- Installs `.ttf`, `.otf`, `.ttc`, and `.otc` files into `~/Library/Fonts`
- Accepts a single font file, a folder of fonts, or a `.zip` archive
- Can trash the original source after a successful install
- Lets you choose how to handle duplicate font filenames
- Shows a summary after install

## How to use

1. Select one or more font files, a folder, or a zip archive in Finder.
2. Open Raycast.
3. Run `Install Fonts`.

## Preferences

- `Trash source after install`
- `Duplicate handling`
- `Show Fonts folder after install`

## Notes

- The command currently reads the active Finder selection directly.
- Zip archives are extracted to a temporary directory before installation.
