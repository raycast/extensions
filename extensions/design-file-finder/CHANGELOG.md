# Design File Finder Changelog

## [Initial Release] - 2026-07-28

- Search `.prproj`, `.psd`, `.psb`, `.ai`, `.aep` across mounted drives.
- Hybrid scanner: Spotlight (`mdfind`) on indexed drives, filesystem walk on the rest.
- **Search Specific Folders**: scope the search to one or more chosen work folders
  (always walked, so a partial Spotlight index can't hide files); falls back to
  whole-drive search when no folders are chosen.
- Sort by Recently Used (Spotlight last-opened ∪ modified time), Name, Folder, Type.
- Filter by app, search by filename or folder. Open, Show in Finder, Open With, Copy Path.
- Hide Adobe auto-save backups by default (preference toggle).
- **New from Template** command: create a `.psd`/`.ai`/`.aep`/`.prproj` from a starter
  file in a configurable Templates folder (copy, never overwrite, optional
  wrap-in-folder + open-after).
