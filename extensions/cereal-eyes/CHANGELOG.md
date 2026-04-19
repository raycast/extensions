# Cereal Eyes Changelog

## [Add URL Shortener and Extension Polish] - {PR_MERGE_DATE}

### Added

- **URL Shortener** command — create and manage short links from Raycast
- Create short URLs with destination URL, optional label, optional custom code, and optional expiration
- Copy short URLs to the clipboard immediately after creation
- Edit short URL labels and toggle links active / inactive
- Open the short URL or its destination directly in the browser
- View short URL analytics in Raycast, including total clicks, recent activity, and top breakdowns by country, device, and referrer
- Surface API-backed short URL errors directly in the Raycast UI for missing scopes, plan restrictions, and validation problems

### Changed

- Updated extension metadata and docs to mention the URL shortener workflow and required short-url API scopes
- Improved shared API error parsing so Raycast shows backend validation and scope errors more clearly

### Fixed

- Snippet edits can now clear title, language, and expiration values instead of leaving stale data behind
- Restricted shares now require at least one valid recipient email before submission

## [Initial Release] - {PR_MERGE_DATE}

### Added

- **Create Snippet** command — save a new snippet with title, content, language, visibility, and optional expiry
- **My Snippets** command — browse and manage all your snippets with a visibility filter (All / Public / Private)
- View snippet detail with syntax-highlighted content and a metadata sidebar (ID, language, visibility, expiry, timestamps)
- Edit any snippet inline — title, content, language, visibility, and expiry
- Delete snippets with a confirmation prompt
- Toggle public / private visibility from the list or detail view
- **Link Share** — create a shareable link (anyone with the link, or Cereal Eyes account required)
- **Burner Link** — create a self-destructing link that expires after a configurable number of views
- **Restricted Share** — share directly with contacts, with autocomplete from your Cereal Eyes contact list (favorites shown first)
- Quick-share actions from the snippet list: one-tap copy of a public link or a 1-view burner link
- **Manage Shares** — list all active and inactive shares for a snippet, copy share URLs, and revoke active shares
- All share and snippet URLs are automatically copied to the clipboard on creation
- Dev / prod environment switching via separate Dev API Token and Dev API Base URL preferences
