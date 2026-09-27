# Paste Image

Paste Image is a native Raycast extension for searching, previewing, and pasting images from folders on your Mac. It keeps a lightweight local index so opening the command and moving between folders stays fast.

## Features

- Import and search multiple image folders.
- Filter results by folder or search by file name.
- Preview images in the detail pane or with macOS Quick Look.
- Paste an image into the frontmost app or copy it to the clipboard.
- Open an image, reveal it in Finder, or save a collision-safe copy to the Desktop.
- Rename images and move unwanted images to the Trash.
- Refresh the local index when folder contents change.
- View and remove imported folders without deleting their files.
- Recover gracefully when a folder is moved, disconnected, or temporarily unavailable.

## Commands

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| **Paste Image**          | Search, preview, paste, and manage indexed images. |
| **Import Image Folders** | Add one or more folders to the image library.      |
| **Manage Image Folders** | Reveal or remove previously imported folders.      |

## Getting Started

1. Run **Import Image Folders** and select one or more folders.
2. Open **Paste Image**.
3. Search by file name or choose a folder from the dropdown.
4. Press `Return` to paste the selected image into the app you were using before Raycast.

Only images directly inside an imported folder are indexed; nested folders are not scanned. Import a nested folder separately when you want to search it.

## Actions and Shortcuts

| Action               | Shortcut                  |
| -------------------- | ------------------------- |
| Paste Image          | `Return`                  |
| Copy Image           | `Command` + `Return`      |
| Open Image           | `Command` + `O`           |
| Show in Finder       | `Command` + `Shift` + `F` |
| Save Copy to Desktop | `Command` + `S`           |
| Rename Image         | `Command` + `E`           |
| Refresh Images       | `Command` + `R`           |
| Import More Folders  | `Command` + `Shift` + `I` |
| Move Image to Trash  | `Command` + `X`           |

Press `Command` + `Y` to open the selected file in native macOS Quick Look. Quick Look is also available from the Action Panel.

## Supported Formats

AVIF, BMP, GIF, HEIC, HEIF, ICO, JPEG, PNG, SVG, TIFF, and WebP files are indexed. Preview and paste support ultimately depends on macOS and the receiving application.

## Folder and File Safety

- Removing an imported folder only removes it from Paste Image. The folder and its contents stay on disk.
- Deleting an image uses the macOS Trash, so it can be recovered from Finder.
- Renaming rejects folder separators, unsupported extensions, and names that would overwrite another file.
- Saving to the Desktop never overwrites an existing file; a number is appended when necessary.

## Privacy and Local Data

Paste Image has no accounts, analytics, or network services. Folder paths and cached file metadata are stored locally in Raycast's extension storage. Small preview assets are generated in Raycast's extension support directory. Images and previews stay on your Mac.

## Troubleshooting

If recently added, renamed, or deleted files do not appear, run **Refresh Images** from the Action Panel. If a folder is unavailable, reconnect its drive or remove and import the folder again.

## Development

Requirements:

- macOS with the latest Raycast
- Node.js 22.22.2 or newer
- npm

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run format:check
```

`npm run dev` loads the extension in Raycast with live development updates.

Before publishing, run every check above from a clean install. Submit the extension to the Raycast Store with `npm run publish`; the project intentionally blocks `npm publish`.

## License

[MIT](LICENSE)
