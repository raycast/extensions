# Mint for Raycast

Shortcuts to [Mint](https://mintstorage.app/r/raycast), the Mac app that shows what fills your disk and gives the space back. Raycast is where you ask; the signed Mint app does every scan and every change, with the same rules, history and Undo as its own window.

## Commands

Every command is a list with a picture beside it: groups on the left, what is in the selected one on the right, and ↵ doing the obvious thing for that group.

- **View Mac Status**: the Mint menu bar dropdown on one screen. Disk and Memory rings with their Auto Care, and your organized folders with how many files each would sort.
- **Free Disk**: Mint's groups, Optimizable, Safe to clean and Yours, each with what is in it. ↵ optimizes every copy, or deletes everything Safe to clean after one question; your own files are always chosen one by one. While Mint scans, a bar shows how far it is and how many files it has read.
- **Optimize Storage**: where space can come back without deleting anything, by source: Codex, Claude, Cursor, your files, app data and temporary files. Beside each, its duplicate files and how many copies each has. ↵ optimizes them all, ⌘↵ one source.
- **Free Memory**: Idle, In use and Ask first, each with its apps. ↵ on Idle quits every idle app; the others are chosen.
- **Organize a Folder**: each folder with how many loose files it would sort and where they go. ↵ organizes it.
- **Uninstall App**: the selected app and everything it left behind, with the total. ↵ moves them to the Trash after one question.
- **Undo Mint Action**: what Mint did recently and which files each run moved. ↵ puts it back.
- **Show Disk Growth**: what grew most this week, by app and folder, category or AI tool, each with its size over every map Mint has drawn.

## Requirements

Mint 1.0.80 or later (1.0.81 adds live progress and the Disk page's groups), the edition from [mintstorage.app](https://mintstorage.app/r/raycast-download), opened once from Applications. Mint is free to download: scanning, organizing and freeing memory stay free, and so does your first 1 GB of cleanup. Mint from the Mac App Store or Setapp does not include the command-line tool these commands use.

macOS 14 Sonoma or later.

## How it works

The extension never deletes or moves a file itself. It sends a short request to Mint's signed command-line tool after checking DZG Studio's Developer ID signature, and Mint checks every file again right before it acts. Paths on your Ignore list stay untouched. Paths, file names and scan results stay on this Mac; the extension sends nothing anywhere.
