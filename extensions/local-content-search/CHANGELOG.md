# Local Content Search Changelog

## [Lighter Background Indexing] - 2026-11-12

- Fixed constant background activity when a selected folder holds many files, especially in iCloud Drive: folders are rescanned when they change, not every minute.
- Scans no longer query iCloud Drive or other file providers about files that are not indexed, and never read online-only files.
- Dependency folders, Python environments, caches, package stores, and build output are skipped, and changes inside them no longer start a scan.
- Indexing resumes with a growing pause after a failed run instead of retrying every minute.
- Existing installations update their background service the next time a command is opened.

## [Initial Release] - 2026-10-28

- Search documents, images, audio, and video locally with EmbeddingGemma 2.
- Keep selected folders indexed through an independent macOS login service.
- Pause indexing, exclude folders and file types, and set resource limits.
- Open or reveal matches, preview originals, and copy excerpts or paths.
