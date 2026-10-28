# File Tidy

Turn a messy folder into a browsable archive: files are sorted into prefixed category folders, exact duplicates are quarantined instead of archived twice, questionable files are set aside for review, and the whole run can be undone in one step.

## Commands

### Tidy Folder

Pick a folder (Downloads, Desktop, a memory-card dump…) and review the full plan before anything moves.

**Where files go**

```
ft_Images/2026-07/                 photos, by capture month
ft_Images/Screenshots/2026-07/     recognised by filename
ft_Documents/Ebooks/2026/          documents, by year
ft_Archives/Installers/            installers, not dated at all
ft_Duplicates/                     byte-identical copies, with a manifest
ft_Review/empty|corrupt|junk/      set aside, never deleted
```

- **Two-level sorting**: extension decides the category, filename and extension rules decide the optional subcategory (Screenshots, Ebooks, Invoices, Contracts, Installers, …).
- **Date depth per category**: photos and videos by year-month (EXIF capture date when available), documents by year, installers and fonts not by date — a download date is not worth a folder per month.
- **The `ft_` prefix** keeps the extension's output visually apart from folders you made yourself. If an un-prefixed archive already exists in the destination, it is reused rather than split into two parallel trees.

**What it detects**

- **Exact duplicates** — byte-level and filename-independent (size → head/tail hash → full SHA-256), including files identical to something already archived in the destination. These are the only files quarantined; a manifest records which copy was kept.
- **Near-duplicates** — the same name once copy markers, source watermarks and date stamps are stripped; the same name in another format; different version numbers of the same release.
- **Similar images** — perceptual hashing catches bursts, re-exports at another resolution, and messenger-recompressed copies that byte-level hashing cannot see.
- **Broken files and junk** — zero-byte files, files whose content doesn't match their extension, and OS debris like `.DS_Store`.

Near-duplicates and similar images are heuristics, not proof, so they are never moved anywhere special — they are flagged and then archived normally, and you decide what to delete. Because they end up in their ordinary folders, the grouping would otherwise vanish the moment the plan closes, so each run that flags anything writes `.tidy/similar.md` in the destination listing every group and where its files landed. Broken files and junk are moved to a review folder and never deleted.

**Options**

- **Tidy in place** creates the category folders inside the source folder itself.
- **Include subfolders** recurses into nested folders.
- **Smart checks** turns the three detection passes off for a plain archive-and-dedupe run.

Nothing is moved until you confirm the plan.

### Undo Last Tidy

Moves every file from the most recent run back where it came from and removes the folders that run created — folders that already existed are left alone. Each run writes a manifest under `.tidy/runs` in the destination, so undo is exact. For an in-place run, pick the source folder itself.

## Preferences

- **Default Destination** — used when you don't pick a destination in the form.

## Customization

Categories, subcategory rules, the folder prefix, date depth and the detection toggles all live in a shared config file, created with sensible defaults on first run:

- macOS and Linux: `~/.config/tidy/config.json`
- Windows: `%APPDATA%\tidy\config.json`

`categories` and `subCategories` replace the defaults outright, so you can remove rules you don't want. Set `folderPrefix` to `""` for un-prefixed folder names, or `detect` to `false` to turn every extra check off.
