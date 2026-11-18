# Image Wallet

## Folder Structure

The Wallet Directory can have multiple Pockets and Cards within it. A Pocket is any folder that
holds at least one Card, at any depth — nested folders become their own Pockets, named by their
path relative to the Wallet Directory.

- Wallet Directory
  - Folder → Pocket "Folder"
    - File
    - File
  - Folder → Pocket "Folder"
    - Folder → Pocket "Folder/Folder"
      - Image
    - File
    - File
  - File → Pocket "Unsorted"
  - File → Pocket "Unsorted"

## Sorting

Cards can be sorted by name, date added, date modified, file size, or by how you actually use
them — "Recently Used" and "Most Used" are tracked whenever you paste or copy a Card. Pick a mode
from the **Sort Cards by** action (`⌘⇧S` / `Ctrl+Shift+S`); the choice is remembered between
launches. The search bar dropdown stays dedicated to filtering by Pocket.

## Previews

- **Images** are shown directly.
- **PDFs** get their first page rendered as a preview. This uses PDFium compiled to WebAssembly,
  so it behaves identically on macOS and Windows with no external tools.
- **Videos** are rendered with AVFoundation on macOS. On Windows they require
  [ffmpeg](https://ffmpeg.org/) on your `PATH` — without it, video Cards fall back to their
  file-type icon, and you can turn the option off entirely in the extension preferences.
- Everything else falls back to its file-type icon.

Previews are cached; reset them with `⌘⇧R` / `Ctrl+Shift+R`.

## Appearance

**Thumbnail Layout** chooses how a Card image sits in its cell: inset (centred with padding,
the default), contain (fills the cell with the whole image visible), or fill (cropped edge to
edge). **Cards per Row** sets the column count, from 3 to 8.

## Platform Notes

The extension runs on both macOS and Windows. Shortcuts use `⌘` on macOS and `Ctrl` on Windows.
