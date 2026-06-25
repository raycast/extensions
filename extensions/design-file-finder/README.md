# Creativity Files Finder

A Raycast extension that finds creative project files (`.prproj`, `.psd`, `.psb`, `.ai`,
`.aep`) across your mounted drives, sorts them by recency, and launches them with one
keystroke. Choose which drives to search.

## Why it's built this way

macOS Spotlight is not always on for every volume (on this machine the internal drive's
index is off, the external SSD's is on). So the scanner is **hybrid**:

- **Indexed drives** → `mdfind` (instant).
- **Non-indexed drives** → a `fast-glob` filesystem walk (pruned to skip system/cache
  dirs). The internal/root volume is walked from `$HOME` to stay fast.

"Recently used" sorts by the more recent of the Spotlight *last-opened* date (indexed
drives only) and the file's modified time.

## Run it (plain shell — any runtime)

```bash
cd ~/Developer/design-file-finder
npm install          # installs @raycast/api and brings the `ray` CLI into node_modules/.bin
npm run test         # unit tests (vitest)
npm run dev          # opens the command in Raycast in development mode (hot reload)
npm run build        # production build / validation
```

`npm run dev` registers the command into your local Raycast so it shows up under
"Search Design Files". Leave it running while developing; stop it and the dev command
stays installed until you remove it from Raycast.

## Commands

### Search Creativity Files

- Type to filter by filename or folder.
- Search-bar dropdown: filter by app (All / Premiere / Photoshop / Illustrator / AE).
- `Sort By` action (in the action panel): Recent · Name · Folder · Type.
- `Enter` opens in the default app · `⌘↵` reveals in Finder · `⌘C` copies the path ·
  `⌘O` opens-with · `⌘R` refreshes the index.
- **Scope the search.** `⌘F` **Search Specific Folders** — add one or more folders where
  your real work lives and it searches only those (cuts out preset packs / template
  noise from a whole-drive scan). With no folders chosen it falls back to `⌘D`
  **Configure Drives** (whole drives, toggle which).
- Adobe **auto-save** backups are hidden by default (preference toggle to show them).

### New from Template

Create a new `.psd` / `.ai` / `.aep` / `.prproj` from a starter file.

1. Set **Templates Folder** in the command's preferences — point it at a folder of your
   starter files (searched recursively).
2. Optionally set a **Default Destination** folder.
3. Run the command: pick a template, type a project name, choose where it goes, and
   optionally wrap it in a folder named after the project / open it after creating.

The template is copied (never moved), and it refuses to overwrite an existing file.

## Layout

- `src/search-design-files.tsx` — the command UI.
- `src/lib/*` — pure, unit-tested logic (extension matching, recency/sort, formatting,
  mdfind query building/parsing, dedupe, cache) plus the impure I/O orchestration
  (`drives.ts`, `scan.ts`, `mdls.ts`, `cache.ts`).
- `docs/superpowers/specs/` — the design spec.
