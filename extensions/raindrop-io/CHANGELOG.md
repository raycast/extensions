# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - {PR_MERGE_DATE}

### Added

- **AI-Powered Suggestions**: Added a new "Use AI Tagging" action (`cmd+shift+a`) to the Add Bookmark form.
- Utilizes Google's Gemini model to automatically suggest a title, collection, description, and up to 5 relevant tags for the link being saved.
- The AI can use Google Search and directly access the link's content for high-quality suggestions.
- To use this feature, a new preference for a Google AI Studio (Gemini) API key has been added.

### Changed

- **Existing Bookmark Flow**: Replaced the `ExistingBookmarkPill` with a "Show Existing Bookmark Details" action, providing a full detail view for duplicate bookmarks.