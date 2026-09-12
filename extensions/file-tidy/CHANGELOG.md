# File Tidy Changelog

## [New Icon, and Previews That Leave No Trace] - 2026-08-18

- A refreshed extension icon, with the Store screenshots re-shot to match.
- Previewing a plan no longer writes anything to the destination. The perceptual-hash cache used by similar-image detection was saved during analysis — before you confirm anything — which could create the destination folder (and a `.tidy` folder inside it) just for looking at a plan. The cache is now written only after a run completes, keyed by where each image actually landed.
- Images moved to a destination on another volume now keep their modification time, so the hash cache still recognizes them on the next run instead of decoding them again; saving the cache also merges with what is already on disk rather than overwriting entries another run wrote in the meantime.

## [Look-Alike Report] - 2026-08-09

- Near-duplicates and similar images are still only flagged and still archived normally — but the grouping no longer disappears when the plan closes. A run that flags anything now writes `.tidy/similar.md` in the destination, listing each group and where its files ended up, so you can work through them later instead of having to act while the plan is open. The success toast offers to open it.

## [Maintenance] - 2026-08-08

- Internal cleanup with no change to how the commands behave. The ` (n)` suffix used for a name collision is now produced in a single place, so the name shown in the plan and the name written to disk cannot drift apart as the code changes.

## [Smart Checks and a Prefixed Archive Structure] - 2026-08-04

- Archive folders are now named `ft_Category/[Subcategory]/[date]`. The `ft_` prefix keeps tidy's output apart from folders you made yourself; an existing un-prefixed archive is reused rather than split in two. Subcategories (Screenshots, Ebooks, Invoices, Installers, …) come from configurable name and extension rules.
- Date depth is per-category: photos and videos by year-month (EXIF capture date when available), documents by year, installers and fonts not by date at all.
- **Near-duplicate detection**: files whose names match once copy markers, source watermarks and date stamps are stripped; the same name in another format; different version numbers of the same release. Flagged in the plan only — these are heuristics, so the files are still archived normally.
- **Similar-image detection**: perceptual hashing catches bursts, re-exports at another resolution, and messenger-recompressed copies that byte-level hashing cannot see. Flagged in the plan only.
- **Health checks**: zero-byte files, files whose content doesn't match their extension, and OS junk are moved to a review folder — never deleted.
- A "Smart checks" toggle in the form turns the three detection passes off for a plain archive-and-dedupe run.
- The plan now shows the name each file will actually land under, including the ` (n)` suffix added for a collision.
- Undo only removes folders the run itself created, and refuses to act on a tidy record that is corrupt or points outside the destination — including one that reaches outside through a symlinked folder, which a purely textual path check would have accepted.
- Failures now explain themselves: an unparsable config file, a folder name in the config that isn't a plain name, and a failed cross-volume copy each say what went wrong instead of surfacing an internal message.
- A file that disappears mid-run — a download finishing and its temp file being renamed away, say — no longer aborts the scan. It drops out of that comparison and everything else is still analyzed.
- Tidying a large folder is markedly faster: the run record is no longer rewritten once per file, so a 4,000-file run went from 2.7s to 0.3s with the window responsive throughout.

## [Initial Version] - 2026-07-31

- **Tidy Folder**: archive a folder's files into `Type/Year-Month` buckets (EXIF capture date for photos and videos when available), with byte-level duplicate detection (size → head/tail hash → full SHA-256) that quarantines identical files instead of archiving them twice. Always shows the full plan for confirmation before moving anything.
- **Undo Last Tidy**: move every file from the last run back to its original location and clean up emptied folders.
- Optional in-place mode (category folders inside the source folder), subfolder recursion, and a configurable default destination.
