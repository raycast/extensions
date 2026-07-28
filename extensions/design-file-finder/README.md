# Design File Finder

Find design project files (`.prproj`, `.psd`, `.psb`, `.ai`, `.aep`) across your
mounted drives, sort them by recency, and open them with one keystroke.

## How it works

macOS Spotlight is not always enabled on every volume. The scanner is **hybrid**:

- **Indexed drives** → Spotlight (`mdfind`) for an instant search.
- **Non-indexed drives** → a filesystem walk (pruned to skip system/cache dirs).
  The internal/root volume is walked from your home folder to stay fast.

"Recently used" sorts by the more recent of Spotlight's last-opened date
(indexed drives only) and the file's modified time.

## Commands

### Search Design Files

- Type to filter by filename or folder.
- Search-bar dropdown: filter by app (All / Premiere / Photoshop / Illustrator / AE).
- `Sort by…` action: Recently Used · Name · Folder · Type.
- `Enter` opens · `⌘↵` reveals in Finder · `⌘C` copies the path · `⌘O` opens with ·
  `⌘R` refreshes.
- **Scope the search.** `⌘F` **Search Specific Folders** — search only chosen work
  folders (always walked, so a partial Spotlight index can't hide files). With no
  folders chosen it falls back to `⌘D` **Configure Drives**.
- Adobe **auto-save** backups are hidden by default (preference toggle).

### New from Template

Create a new `.psd` / `.ai` / `.aep` / `.prproj` from a starter file.

1. Set **Templates Folder** in the command's preferences — a folder of starter
   files (searched recursively).
2. Optionally set a **Default Destination** folder.
3. Run the command: pick a template, type a project name, choose where it goes,
   and optionally wrap it in a folder / open after creating.

The template is copied (never moved) and never overwrites an existing file.
