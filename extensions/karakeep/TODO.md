# TODO

## P0 - Critical Fixes (Must Have)

- [x] When creating a Note, action should be "Create Note" not "Create Bookmark"
- [x] Improve UI text in Preferences; use Note vs Text consistently
- [x] Make Delete actions appear as destructive actions (`Action.Style.Destructive` in `ActionPanel`):
  - [x] Delete Bookmark
  - [x] Delete Note
  - [x] Delete List
  - [x] Delete Tag
  - [x] Delete Highlight
  - [x] Delete Backup

## P1 - Core Features (High Priority)

### List Management

- [x] Add ability to manage lists
  - [x] Add list creation — API: [`POST /api/v1/lists`](https://docs.karakeep.app/api/karakeep-api/create-list)
  - [x] Add list deletion — API: [`DELETE /api/v1/lists/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-list)
  - [x] Add list updating — API: [`PATCH /api/v1/lists/{id}`](https://docs.karakeep.app/api/karakeep-api/update-list)
  - [x] Add Parent List field to create/edit list forms
  - [x] Add List Type field (manual/smart) to create/edit list forms
  - [x] Add Search Query field to create/edit list forms (smart lists only)
  - [x] Switch list icon field from dropdown to text field (allows any emoji via system picker)
- [x] Sort Lists by name alphabetically

### Tag Management

- [x] Add ability to manage tags
  - [x] Add tag creation — API: [`POST /api/v1/tags`](https://docs.karakeep.app/api/karakeep-api/create-tag)
  - [x] Add tag deletion — API: [`DELETE /api/v1/tags/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-tag)
  - [x] Add tag renaming — API: [`PATCH /api/v1/tags/{id}`](https://docs.karakeep.app/api/karakeep-api/update-tag)

### Note Management

- [x] Add ability to manage notes
  - [x] Add Notes list (show only `type: "text"` bookmarks) — API: [`GET /api/v1/bookmarks`](https://docs.karakeep.app/api/karakeep-api/list-bookmarks) with `?type=text` filter
  - [x] Add note deletion — API: [`DELETE /api/v1/bookmarks/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-bookmark)
  - [x] Add note updating — API: [`PATCH /api/v1/bookmarks/{id}`](https://docs.karakeep.app/api/karakeep-api/update-bookmark)
  - [x] Clarify: Notes are bookmarks with `type: "text"`, not a separate entity
- [x] Add action to Create Note from Notes listing (should be default action when no notes exist)
- [ ] Add ability to move between Notes with a hotkey (Go to Previous/Next Note)

### Highlights

- [x] Add ability to manage highlights
  - [~] Add highlight creation — **Removed**: Requires DOM character offsets; not feasible without the browser extension
  - [x] Add highlight deletion — API: [`DELETE /api/v1/highlights/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-highlight)
  - [x] Add highlight updating — API: [`PATCH /api/v1/highlights/{id}`](https://docs.karakeep.app/api/karakeep-api/update-highlight)
- [x] Add an "Open Bookmark" action to each highlight to open related bookmark
- [ ] Add ability to move between Highlights with a hotkey (Go to Previous/Next Highlight)

### Bookmarks View Enhancements

- [x] To Bookmarks view, add Lists SearchBar accessory filter
- [x] To Bookmarks detail view, add icon to AI-generated tags
- [x] When adding a bookmark, allow adding tags; support retreiving Karakeep's AI-suggested tags (`attachedBy: ai`)
- [x] When adding a note, allow adding tags; support retreiving Karakeep's AI-suggested tags (`attachedBy: ai`)
- [x] Sort Bookmark List dropdown filter alphabetically
- [x] Add tag picker to BookmarkEdit form
- [X] Add "Copy Link" action to bookmark list items
- [ ] To Create Bookmark view, add action to "Generate AI tags" and add them to the list of tags
- [ ] Add ability to move between Bookmarks with a hotkey (Go to Previous/Next Bookmark)

- [ ] In `BookmarkEdit` and `NoteEdit`, guard `pop()` so it only runs on success — switch from `runWithToast` back to manual try/catch so the form stays open on API failure and the user can retry

### Technical Foundation

- [x] Confirm pagination is using native Raycast pagination
- [x] Add `Action` keyboard shortcuts (e.g., `⌘↵` for primary, `⌘⇧↵` for secondary)
- [x] Make sure we're using common Raycast keyboard shortcuts
- [x] Handle API errors gracefully with user-friendly messages
- [x] Add loading states for all async operations
- [x] Ensure all `Form` views have proper validation and error handling
- [x] Add `Toast` feedback for async operations (create/delete/update)
- [x] Add `List.EmptyView` for empty states in all list views

## P2 - Enhancements (Medium Priority)

### Backups

- [x] Add ability to manage backups
  - [x] Add backup view — API: [`GET /api/v1/backups`](https://docs.karakeep.app/api/karakeep-api/list-backups)
  - [x] Trigger backup — API: [`POST /api/v1/backups`](https://docs.karakeep.app/api/karakeep-api/create-backup)
  - [x] Download backup — API: `GET /api/v1/backups/{id}/download`
  - [x] Delete backup from list — API: [`DELETE /api/v1/backups/{id}`](https://docs.karakeep.app/api/karakeep-api/delete-backup)
  - [x] Delete Backup destructive action styling
- [x] Backup list shows "No backups yet" even while loading — `!isLoading && backups.length === 0` guard already prevents the flash
- [x] Poll for backup status after creation; auto-stop polling when no backups are pending
- [x] Restrict Download Backup action to `status === "success"` only; show failure toast on `pending → failure` transition
- [x] Color-code backup status tags (green = success, red = failure, gray = pending)

### Analytics

- [x] Add user stats Command:
  - [x] Add stats view — API: [`GET /api/v1/users/me/stats`](https://docs.karakeep.app/api/karakeep-api/get-current-user-stats) (includes bookmark counts by type, top domains, tag usage, bookmarking activity patterns, and storage usage)
- [x] Remove empty heading rows in Markdown
- [x] Add Refresh action to refresh stats
- [x] To the Detail view rows, add links that open the related content type views (e.g. Tags → Tags list, Bookmarks → Bookmarks list, etc.)
- [x] Add metric label to "Activity" section (what do the counts represent?)
- [x] Add SVG charts for Bookmark Sources, Activity by Hour, Activity by Day (theme-aware via `environment.appearance`)

### Browser Extensions

- [x] Add Action to install [Chrome Extension](https://chromewebstore.google.com/detail/karakeep/kgcjekpmcjjogibpjebkhaanilehneje), [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/karakeep/) and [Safari extension](https://apps.apple.com/us/app/karakeeper-bookmarker/id6746722790) to Bookmarks command — added as "Get Browser Extension" section in BookmarkItem actions panel
- [x] Add link to [Chrome Extension](https://chromewebstore.google.com/detail/karakeep/kgcjekpmcjjogibpjebkhaanilehneje), [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/karakeep/) and [Safari extension](https://apps.apple.com/us/app/karakeeper-bookmarker/id6746722790) to README

### Logging

- [x] Add extensive logging using @chrismessina/raycast-logger
  - [x] Log all API calls
  - [x] Log all errors
  - [x] Log all successes
  - [x] Add preference for verbose logging

## P3 - Polish & Advanced Features (Lower Priority)

- [ ] Add support for Raycast AI Tools
- [ ] Add cross-extension integration with Reader Mode or [Send to Kindle](https://www.raycast.com/lemikeone/send-to-kindle) extension (e.g. "Open Link in Reader Mode" and "Send to Kindle" actions)
- [ ] Implement optimistic updates for better UX
- [x] Update README and CHANGELOG with proper documentation
