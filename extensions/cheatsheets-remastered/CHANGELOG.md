# Cheatsheets Remastered Changelog

## [Metadata and Markdown Import] - 2026-11-05

- Read titles, descriptions and tags from repository Markdown frontmatter, including saved sheets offline.
- Search repository metadata, see tags in lists and read full descriptions in sheet details.
- Import a local Markdown file as an editable personal copy from Manage Custom Cheatsheets; skip identical saved content.
- Handle invalid metadata safely and preserve original Markdown, existing sheets and saved state.
- Update the Raycast API for compatibility with the current release.

## [Markdown and Sync Reliability] - 2026-11-04

- Preserve original Markdown for copying and improve display of frontmatter, Unicode, tables and code examples.
- Keep the previous repository snapshot when a download fails or is canceled; validate and bound downloads before saving a complete revision.
- Validate local storage, retain legacy collections, back up the previous snapshot and protect concurrent writes.
- Keep favorites, hidden state and history independent across repositories, branches and paths; preserve ambiguous legacy state.
- Fix title search, view counts, recent navigation, drafts, stale edits and refresh after changes.
- Add search within a sheet with heading context, source lines and exact section copying.
- Restore six MIT-licensed historical reference editions with targeted accuracy fixes; exclude `basic`, `keywords_test`, `packs` and `polyfill.io`, update the bundled index and remove the obsolete polyfill CDN loader from the styling example.
- Update Raycast dependencies, documentation and bundled software notices. GitHub OAuth behavior and macOS support are retained.

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
