# Granola Changelog

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