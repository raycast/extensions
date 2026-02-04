# Files Shelf — Development Plan

## Overview

A Raycast extension that lets users collect files/folders from different locations into a virtual "shelf", then perform batch actions: copy, move, or rename.

## Architecture

```
src/
├── add-to-shelf.ts           # Command: add Finder selection to shelf (no-view)
├── view-shelf.tsx            # Command: browse and manage shelf items
├── copy-to-selection.tsx     # Command: copy shelf to Finder folder
├── move-to-selection.tsx     # Command: move shelf to Finder folder
├── rename-shelf.tsx          # Form: batch rename with preview
└── lib/
    ├── types.ts              # ShelfItem interface, RenameOptions, etc.
    ├── shelf-storage.ts      # LocalStorage CRUD operations
    ├── file-operations.ts    # Copy, move, rename with conflict handling
    └── file-icons.ts         # File type → icon mapping
```

## Data Model

```typescript
interface ShelfItem {
  id: string;           // Unique identifier
  name: string;         // File/folder name
  path: string;         // Full absolute path
  type: "file" | "folder";
}

type ConflictStrategy = "skip" | "replace" | "rename";
```

---

## Commands

### 1. Add to Shelf
- **Mode**: `no-view`
- **Input**: Finder selection via `getSelectedFinderItems()`
- **Behavior**: Add items to LocalStorage, skip duplicates by path
- **Output**: HUD showing count added

### 2. View Shelf
- **Mode**: `view`
- **Features**:
  - Items grouped by parent folder
  - File type icons (Design, Image, Video, Code, etc.)
  - Toggleable details panel with shelf statistics
  - Search across items
- **Item Actions**: Show in Finder, Open With, Copy Path, Remove
- **Shelf Actions**: Copy All, Move All, Rename All, Clear Shelf

### 3. Copy Shelf to Finder Selection
- **Mode**: `view` (confirmation screen)
- **Features**:
  - Detect conflicts (items with same name at destination)
  - Show conflict list before action
  - Conflict strategies: Skip, Replace, Auto-Rename
- **Output**: HUD with success/skipped/failed counts

### 4. Move Shelf to Finder Selection
- **Mode**: `view` (confirmation screen)
- **Features**:
  - Same conflict handling as Copy
  - Cross-volume support (EXDEV fallback: copy + delete)
  - Only removes successfully moved items from shelf
- **Output**: HUD with success/skipped/failed counts

### 5. Rename Shelf Items
- **Mode**: `view` (form + confirmation)
- **Rename Modes**:
  | Mode | Example |
  |------|---------|
  | Prefix | `photo.jpg` → `2024_photo.jpg` |
  | Suffix | `photo.jpg` → `photo_backup.jpg` |
  | Numbering | `a.jpg, b.jpg` → `001.jpg, 002.jpg` |
  | Find/Replace | `old.txt` → `new.txt` |
- **Flow**: Configure → Live Preview → Review → Apply
- **Renames in-place** at original file locations

---

## Security & Edge Cases

### Conflict Handling (Copy/Move)
- **Detection**: Check if `destination/item.name` exists before action
- **UI**: Show conflict list with count
- **Strategies**:
  - `skip` — Leave existing file, don't copy/move
  - `replace` — Delete existing, then copy/move
  - `rename` — Auto-rename to `file (1).ext`, `file (2).ext`, etc.

### Cross-Volume Move (EXDEV)
When `renameSync()` fails with EXDEV:
```typescript
cpSync(src, dest, { recursive: true });
rmSync(src, { recursive: true, force: true });
```

### Partial Failures
- **Move**: Only clear successfully moved items from shelf
- **Copy**: Keep shelf unchanged, show per-item results
- **Rename**: Update shelf only for successfully renamed items

### Rename Safety
- Collision detection: prevent two items → same name in same directory
- Block invalid names: empty, `.`, `..`, OS-specific forbidden chars

### Shelf Integrity
- Items may be deleted/moved outside the extension
- Future: auto-prune missing items or show warning icon

---

## View Shelf Improvements (v0.2)

- [x] Group items by parent folder
- [x] File type icons (Design, Image, Video, Audio, Code, Archive, etc.)
- [x] Toggleable metadata panel with:
  - Total items, files/folders breakdown
  - Total size (formatted)
  - Locations count
  - Categories as tags with icons
  - Extensions as tags
- [x] `formatSize()` bounds check for very large files

---

## Out of Scope (v1)

- Drag & drop into shelf
- Per-item batch selection (operate on subset)
- Advanced rename templating (regex, capture groups)
- Recursive folder size calculation

---

## Testing Checklist

### Manual Tests
- [ ] Add files/folders from multiple directories; verify de-dup
- [ ] Copy to empty destination
- [ ] Copy with conflicts — test Skip, Replace, Auto-Rename
- [ ] Move within same volume
- [ ] Move across volumes (verify EXDEV fallback)
- [ ] Rename each mode; verify preview matches result
- [ ] Verify shelf paths update after rename
- [ ] Remove one item, clear shelf, reload

### Automated (Optional)
- [ ] Unit tests for `generateRenamePreview()`
- [ ] Unit tests for conflict detection logic

---

## Release Checklist

- [ ] Update `CHANGELOG.md` with version notes
- [ ] Expand `README.md`:
  - Setup/usage instructions
  - Known limitations
  - Screenshots/GIFs (optional)
- [ ] Run `npm run lint` and `npm run build`
- [ ] Test on clean install

