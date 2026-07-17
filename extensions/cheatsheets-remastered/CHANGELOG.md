# Cheatsheets Remastered Changelog

## [1.1.0 - Custom User Repos] - 2025-09-09

### Added

* **Repository Manager** to add/remove user-specified GitHub repositories, plus **Sync All Repositories** with progress and error summaries.
* **GitHub API integration** to fetch Markdown (`.md`) files, with optional branch and subdirectory support.
* **File exclusion filters** to ignore non-`.md` and admin paths (e.g. `.github/`, workflows, licences, changelogs).
* **Integrated repository cheatsheets** in the main “Show Cheatsheets” list, with clear repo labels and type-specific icons.
* **Favouriting** for repository cheatsheets and a **Favourites** filter in the search bar.
* **Clickable “View on GitHub” links** on imported cheatsheets; custom GitHub icon assets (SVG/PNG).
* **HTML element processing** in repository Markdown to improve rendering.
* **Sort preference moved to extension settings**; clearer **Filter** dropdown labels.

### Changed

* Unified list combines **built-in**, **custom**, and **repository** sheets for a single browsing and search experience.
* Refined search UI (filter dropdown in search bar, consistent icons/subtitles) and improved performance for repo details counts.

### Fixed

* Repository names now display correctly (no random IDs).
* Corrected sync metadata handling (accurate `lastSyncedAt`; improved sync time display).

### Removed

* Deprecated **“copy-cheatsheet”** command to reduce command clutter.

### Maintenance

* Audited and normalised built-in cheatsheets (front-matter added, `index.json` added, outdated sheets archived).

## [1.0.0 - Initial Release] - 2025-08-26

### Added
- Initial public release of Cheatsheets Remastered
- Local-first default sheets from `assets/cheatsheets`
- Full-text search across local defaults in `Show Cheatsheets` view
- Create and manage custom cheatsheets
- Enhanced search functionality in Show Cheatsheets that prioritizes title matches over content matches
- Separate sections for "Title Matches" and "Content Matches" when searching
- Improved search result organization and user experience
