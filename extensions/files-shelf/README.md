# Files Shelf

<p align="center">
  <img src="assets/files-shelf-icon.png" alt="Files Shelf" width="128" />
</p>

**Batch move, copy, or rename files and folders from different directories.**

A Raycast extension that lets you collect files and folders from anywhere on your Mac into a virtual "shelf," then run batch actions: copy all to a folder, move all, or rename with prefix, suffix, numbering, or find/replace. Handles conflicts and works across volumes.

---

## Commands

| Icon                                                                | Command                  | Description                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <img src="assets/add.png" alt="Add to Shelf" width="64" />          | **Add to Shelf**         | Add the current Finder selection to the shelf. Run from Finder with items selected; duplicates by path are skipped.                                                                        |
| <img src="assets/view.png" alt="View Shelf" width="64" />           | **View Shelf**           | Browse shelf items (grouped by folder), search, see stats, and run item actions: Show in Finder, Open With, Copy Path, Remove. Shelf actions: Copy All, Move All, Rename All, Clear Shelf. |
| <img src="assets/copy.png" alt="Copy Shelf to Folder" width="64" /> | **Copy Shelf to Folder** | Copy every shelf item to the open or selected Finder folder. Choose how to handle conflicts: Skip, Replace, or Auto-Rename.                                                                |
| <img src="assets/move.png" alt="Move Shelf to Folder" width="64" /> | **Move Shelf to Folder** | Move every shelf item to the open or selected Finder folder. Same conflict options; supports cross-volume moves (copy + delete when needed).                                               |
| <img src="assets/rename.png" alt="Rename Shelf Items" width="64" /> | **Rename Shelf Items**   | Batch rename shelf items with live preview. Modes: **Prefix**, **Suffix**, **Numbering** (e.g. `001.jpg`, `002.jpg`), or **Find/Replace**.                                                 |

---

## Requirements

- **macOS** (Raycast with Finder integration)
- Select files/folders in Finder, or have a Finder window open, when using Add to Shelf or Copy/Move to Folder

---

## Preference

- **Keep Shelf After Completion** — When off (default), the shelf is cleared after a successful copy, move, or rename. When on, items stay on the shelf.
