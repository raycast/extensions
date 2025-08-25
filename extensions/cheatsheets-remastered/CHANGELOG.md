# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced search functionality in Show Cheatsheets that prioritizes title matches over content matches
- Separate sections for "Title Matches" and "Content Matches" when searching
- Improved search result organization and user experience

### Changed
- Removed standalone search-cheatsheets command (functionality integrated into show-cheatsheets)
- Search results now show title matches first, followed by content matches for better relevance

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial public release of Cheatsheets Remastered
- Local-first default sheets from `assets/cheatsheets`
- Full-text search across local defaults in `Show Cheatsheets` view
- Create and manage custom cheatsheets