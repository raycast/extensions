# Granola Changelog

## 2.0.0 - 2026-01-06

### 🚀 Exports & Notion
- Export Notes now streams small batches to disk, writes files immediately, and batches enhanced notes/My Notes retrieval to reduce memory usage and timeouts during large exports.
- Export Transcripts now exports directly to a ZIP (no intermediate retrieve/results or clipboard flow) with unified progress/ETA messaging.
- Export and transcript lists now use selection-focused action panels with consistent shortcuts and clearer "Export/Save All" actions.
- Added batch Save to Notion from Export Notes with a live results list, per-note errors, and quick open/copy actions.
- Removed the hard 500-item cap for exports/Notion; batching now scales with selection size.
- ZIP creation now uses balanced compression and clearer "Exported to Downloads" toasts.
- Added configurable "Notion Max Batch Size" preference to control parallel Notion saves.

### 🧭 Browsing & Details
- Search Notes, People, and Companies now load panel content and "My Notes" on demand for note details (fixing cases where only raw AI notes showed).
- Note list accessories now show date, folder icon (or "not in any folder"), and privacy indicator; folder counts show "..." until document IDs load.
- Folder filtering now loads document IDs lazily to avoid heavy upfront work.

### 🤖 AI Tools
- Removed `ai-notes` and replaced it with explicit `list-meetings` -> `get-note-content`/`get-transcript` flows for clearer intent and lower memory use.
- Added `get-note-content` for note bodies (original/enhanced/auto) and `list-folders` for folder metadata and note counts.
- Updated `list-meetings` guidance to fetch IDs before content or transcript requests and to use stripped document payloads.
- Recipes tool now supports unlisted recipes with normalized slug matching.
- `get-transcript` now validates missing note IDs with a clear error response.
- Expanded AI eval coverage and guidance for folders, recipes, and Notion exports.

### 🔧 Bug Fixes & Performance
- Fixed `create-note-from-transcript` streaming chunks with improved delimiter and validation.
- Reduced memory usage by stripping large fields from document fetches before caching, eliminating cache-file reads, and lazy-loading panels/My Notes via new hooks.
- Replaced cache reads with API-backed document lists in people/company search to avoid loading large local cache files.
- Added batch panel/notes fetch APIs and on-demand folder ID loading to keep large exports responsive.
- Create Note from Transcript now supports cancellation and safer streaming cleanup; Create Note uses Raycast `open` instead of shell execution.
- Addressed reported memory and export failures from: [#24094](https://github.com/raycast/extensions/issues/24094), [#23944](https://github.com/raycast/extensions/issues/23944), [#23801](https://github.com/raycast/extensions/issues/23801), [#23190](https://github.com/raycast/extensions/issues/23190), [#22674](https://github.com/raycast/extensions/issues/22674), [#22544](https://github.com/raycast/extensions/issues/22544), [#22076](https://github.com/raycast/extensions/issues/22076).

and many many more fixes and improvements, etc!
## [1.6.2] - 2025-12-14

- Updated extension icon

## [1.6.1] - 2025-10-08

### ✨ Enhancements
- Added folder-aware filtering to the **Export Transcripts** and **Export Notes** commands, including note counts, folder icons, and a dedicated "Notes Not in Folders" view.
- ZIP exports are now grouped by original folder when available, keeping downloaded files grouped the way they appear in Granola.

### 🔧 Bug Fixes
- Fixed a bug with fetching recipes.

## [1.6] - 2025-09-17

### 🚀 New Commands
- **Search People** - Browse and search people from your Granola meetings
- **Search Companies** - Explore companies from your meetings 

### ✨ New AI Tools
- **Recipes Tool** - Use recipes from Granola within Raycast AI
- **List Meetings Tool** - List meetings from Granola, with optional filtering by title, date, or folder


### 🗑 Removed
- **Browse Folders** command removed as redundant. Use `Search Notes` with the folder filter instead

## [1.5.1] - 2025-08-19

### 🔧 Bug Fixes
- Add support for WorkOS authentication tokens
- Maintain backward compatibility with Cognito tokens  
- Update API client version to 6.157.0

## [1.5] - 2025-07-14

### 🚀 Major New Features
- **Work with multiple notes at once.** New Export Transcripts and Export Notes commands for selecting and processing multiple notes simultaneously.
- **Turn any transcript into a note.** Create Note from Transcript command lets you paste text or YouTube links to generate AI-powered meeting summaries.
- **Save directly to Notion.** Export your notes and transcripts to Notion with batch processing support.
- **Get YouTube transcripts instantly.** Extract and work with transcripts from any YouTube video URL.

### ✨ Enhancements  
- **Improved Folder Icons** - Folders now display with proper icons that reflect how they appear in Granola
- **Cross-platform support** - Added full support for Windows (alongside existing macOS support)
- **Smart batch processing** - Optimized export performance with dynamic batching and progress tracking
- **Enhanced error handling** - Better error messages and recovery for bulk operations
- **ZIP export with organization** - Export multiple notes as organized ZIP files with folder structure
- **Real-time progress tracking** - Live progress updates with ETA calculations for bulk operations

### 🛠 Enhanced Core Tools
- **Get Transcript Tool** - Retrieve full transcript content for any specific note
- **Save to Notion Tool** - Export individual or multiple notes to Notion with batch processing
- **Enhanced AI Notes** - Improved AI integration with better transcript and folder support

## [1.4] - 2025-05-18

### ✨ New Features
- Added folder browsing capability to view and navigate through folders and their notes
- Added folder-related AI queries to support searching by folder

### 🔄 Refactors and Improvements
- Created shared components for consistent note display across commands
- Updated types to support folder structure and improved content handling


## [1.3] - 2025-05-05

### 🐞 Bug Fixes
- Fixed issue where `includeTranscript` was not being set correctly in some cases

## [1.2] - 2025-05-05

### 🐞 Bug Fixes
- Fixed issue where certain queries were not working as expected

### 🔄 Refactors and Improvements
- Move AI instructions and evals from package.json to ai.yaml

## [1.1] - 2025-05-02

### ✨ New Features
- Added transcript fetching capability to view full meeting transcripts
- Enhanced AI integration to support searching and extracting information from transcripts


## [Initial Version] - 2025-04-30

- Added Granola extension
- Added `New Note` command, which starts a new note and recording immediately in Granola
- Added `Search Notes` command, which allows you to view your notes in a list, view their details, copy their links, or copy their contents as HTML or Markdown
- Added `AI Notes` AI command, which allows you to use Raycast AI on top of Granola and other AI extensions 
