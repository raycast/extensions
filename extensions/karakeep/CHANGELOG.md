# Karakeep Changelog

## [2.4.5] - 2026-08-29

- A rejected API key now says so. Every command used to fail with a bare "HTTP 401" and no way to act on it — the lists showed "Couldn't load bookmarks", the forms showed "Couldn't create bookmark", and nothing pointed at the setting that was actually wrong. Bookmarks, Lists, Tags, Highlights, Backups and Stats now show an "Invalid API key" screen with Open Extension Settings as the default action, and every error toast in the extension offers the same
- One bad key no longer produces a pile of unrelated errors. Opening Search Bookmarks reported "Couldn't load lists", from a request the command only makes to populate its filter dropdown. The key is now checked once before any dependent request runs, and the rest of a command's requests stop after the first rejection instead of each failing separately
- Opening Extension Settings from the "Invalid API key" screen now closes the command. Raycast keeps the preferences a command started with, so a corrected key cannot take effect until the command is run again — the screen used to leave you retrying against a key it could no longer change
- Create Bookmark, Create Note, Create List and the edit forms now stop before writing when the key has been rejected, rather than attempting the save and failing partway through
- Error messages now carry what the server actually said — "HTTP 401 — Unauthorized" instead of a bare status code — with any credentials in the response redacted before they reach a toast or your clipboard
- Refreshing a view no longer reports success when the refresh actually failed
- The Backups view no longer retries every few seconds behind an error screen when the API key is what is wrong, and creating or deleting a backup that was rejected no longer follows the failure with a second, duplicate error
- Copy URL is available again on a bookmark. It shared a condition with Open URL — which is hidden when it is already the ↵ action — so anyone using the default "Open in Browser" setting never saw Copy at all. The action panel is also ordered more usefully: whichever action you have bound to ↵ stays first, and the rest now put what you do with the bookmark's content ahead of what you do to the record — so with the default setting a link reads Open URL, Copy URL, Edit, View Detail
- The interface says URL rather than Link throughout, matching Raycast's own wording and the detail pane, which already said URL next to an action that said Link
- The list icon field now uses Raycast's own emoji picker instead of one bundled into the extension. [Raycast 2.1](https://www.raycast.com/changelog/macos/2-1) added an inline picker to every text field — type `:` followed by a name — which searches every emoji and follows your skin tone preference. The ⌘I grid it replaces has been removed, and the extension is a good deal smaller for it
- Upgraded to Raycast API 2.1

## [2.4.4] - 2026-08-17

- Fixed a custom title being applied to an existing bookmark even when the rest of the submission failed. Adding a bookmark whose URL is already saved renames it, and that rename now happens only after the list and tag steps have succeeded, so a failure leaves the existing bookmark untouched
- Create Bookmark no longer reports "Creation failed" when the bookmark was saved and only a later step failed. The toast now says which part didn't apply (the list, the tags, or the title) and the form stays open so you can retry without retyping anything
- Fixed the Update Karakeep command offering to copy a Docker command for a previously-detected instance after a re-check had failed, and carrying the earlier result's state into the next check
- Added a "Use Page Title" action (⌘T) to Create Bookmark, which fills the Title field from the active browser tab. It appears only when the Raycast browser extension is available, since that is the only source of a page title. The field is still empty by default, because a title you set overrides the one Karakeep reads from the page and keeps it from ever updating
- Fixed the Safari entry under "Add to Browser" opening an App Store listing that no longer exists. It now opens the Karakeep app
- Keyboard shortcuts now follow Raycast's standard bindings, so they match what you already know from other extensions. Delete moved to ⌃D, Edit to ⌘E, Open to ⌘O, Copy ID to ⌘⇧C, and Clear Cache to ⌃⇧D; every shortcut also declares an explicit Windows binding
- Backing out of the "Delete list" confirmation no longer shows a red "Delete cancelled" error, matching every other confirmation in the extension
- Error toasts that report a failure with no underlying exception — a browser tab that couldn't be read, a bookmark the server returned empty, a backup that failed on its own — now let you copy the details, so every error toast can be turned into a bug report

## [2.4.3] - 2026-08-13

- Added an optional Title field to Create Bookmark. Leave it empty to use the page title detected by Karakeep. Custom titles are also applied when the submitted URL already exists in Karakeep.

## [2.4.2] - 2026-08-12

- Added an "Add to List" action to the Bookmarks and Bookmark Detail views, as a submenu you can filter by typing (⌘⇧L)
- The list icon field takes any single emoji again, and ⌘I opens a searchable grid of all 1,870 emoji. Keycap emoji (1️⃣, #️⃣, *️⃣) are now accepted — the validator was rejecting them
- Lists that share a name are now distinguished by their parent list — in the Lists view, the Add to List menu, and the parent-list pickers — since Karakeep allows duplicate list names
- Fixed list creation failing with "HTTP 400". The API requires an icon, and the form sent none when the field was left empty
- Fixed every command with a list dropdown firing one request per list on open. A bookmark count was fetched for each list, which cost 45 requests on a 45-list library and reported the wrong number anyway — it was capped at the page size, so any list with more than 10 bookmarks showed "(10)".
- Added an "Update Karakeep" command that pulls the latest Docker images and restarts a local instance, with live progress. A failed update names the cause — registry unreachable, not authorized, out of disk, port in use — and says whether your instance is still running
- The Update command refuses to run when it can't prove which Docker project is Karakeep — if more than one project publishes your port, if what's answering there doesn't identify as Karakeep, or if the container is stopped while something else already holds the port — rather than recreating an unrelated app. When Karakeep is stopped there's nothing to ask, so the update names the project and asks you to confirm before recreating it
- Docker detection now works on Windows, matches the published port by protocol and bind address rather than number alone, and only offers to start containers Docker can actually start
- After a successful update, ⌘Y opens the release notes for the version you're running, fetched from GitHub
- Rewrote the settings labels for Raycast 2.0's preferences UI
- Preview image failures are now logged with the underlying cause instead of failing silently into a placeholder
- API errors now say what actually failed (e.g. "icon: expected string, received undefined") instead of a bare status code. This also covers Search and Summarize, whose errors are shaped differently and were showing only "HTTP 500"

## [2.4.1] - 2026-08-08

- Fixed every bookmark appearing twice after going offline and reconnecting. The pagination prefetch ran even when the server was unreachable, which advanced the page counter while the request failed; the next successful fetch was then appended to the cached rows instead of replacing them. The prefetch now waits for a request that has actually succeeded.
- Updated `@chrismessina/raycast-logger` to 1.3.0, which hardens credential redaction in logs — including credentials embedded in URLs, and values that previously escaped masking by their runtime type.
- Updated `@raycast/api` to 1.104.24.

## [2.4.0] - 2026-07-31

### Offline and Docker recovery

- When a self-hosted instance is unreachable, the extension now detects a stopped local Docker container and offers to start it — including every service in a Compose project — then waits for the API to answer before retrying
- Every command handles an unreachable server: list views show a recovery screen with Start, Try Again, Open Docker, Extension Settings, and Copy Error actions instead of an empty list, and Quick Bookmark recovers inline through its toast
- The Create Bookmark, Create Note, and Create List forms show an offline notice and promote "Start Karakeep" to the primary action while the server is down, since submitting is blocked until it is running
- Create commands check reachability before writing, so a stopped instance no longer risks losing typed input; what you typed is copied to the clipboard if the write can't proceed
- The Start action only appears when a stopped local container actually exists, so remote and hosted instances aren't offered a recovery step that can't help them

### Fixes

- Connection errors now report the underlying cause (e.g. `ECONNREFUSED`) instead of the opaque "fetch failed", and no longer stack a generic "Failed to fetch latest data" toast on top of the recovery screen
- Fixed a cached list being shown as though it were current while the server was unreachable — the recovery screen now appears whenever no request has succeeded, including after switching to a different list or tag
- Updated the extension icon
- Updated dependencies

## [2.3.2] - 2026-06-05

- Fixed bookmark preview images not rendering by caching previews locally and escaping local image paths in Markdown

## [2.3.1] - 2026-04-01

- Fixed an issue where typing an existing tag name in the Add New Tag picker would not add it to the Tags list

## [2.3.0] - 2026-03-22

### New Features

- **Edit Note** — Notes now open a dedicated Edit Note form with the correct fields: Content, Custom Title, Tags, and Add New Tag. Previously, editing a note used the link bookmark form.
- **Tag editing on bookmarks and notes** — The Edit Bookmark and Edit Note forms now include a tag picker. Existing tags are pre-selected; you can add new tags or remove existing ones and they are attached/detached on save.

### Improvements

- **Tag picker refactored into a shared hook** — All tag-picking logic (state, new-tag creation, comma-split input, attach/detach payload builders) lives in a single `useTagPicker` hook shared across Create Bookmark, Create Note, Edit Bookmark, and Edit Note.
- **Edit Bookmark uses `runWithToast`** — Consistent toast handling with Edit Note; error toasts now include a "Copy Error" action.
- **Add New Tag field changed from TextArea to TextField** — Prevents accidental newline submission; typing a comma commits a tag inline.

### Fixes

- **Emoji list icons with variation selector now accepted** — Fixed `isEmoji` rejecting emoji followed by `\uFE0F` (e.g. ☁️).
- **Escaped pipe characters in Stats markdown tables** — Domain names, tag names, and asset type names containing `|` no longer break the table layout.
- **Delete Tag now shows a confirmation prompt** with destructive styling before removing a tag.
- **ESLint violations fixed** — `import/first` violations and `no-misleading-character-class` in emoji validation.

### Chores

- Moved verbose logging preference to its own section in Settings
- Removed legacy `.eslintrc.json` (superseded by `eslint.config.mjs`)
- Updated README screenshots and documentation

---

## [2.2.0] - 2026-03-09

### New Features

- **List management** — Create, edit, and delete lists from the Lists command. Supports manual and smart lists; smart lists include a query builder with one-click insertion of valid filter qualifiers.
- **Tag management** — Create, rename, and delete tags from the Tags command.
- **Tag picker on bookmark and note creation** — Select existing tags or type new ones when saving a bookmark or note.
- **List filter in Bookmarks** — Filter the Bookmarks view by list using the search bar dropdown.
- **Browser extension links** — Install the Karakeep extension for Chrome, Firefox, or Safari directly from the Actions panel on any bookmark.

### New Commands

- **Notes** — Dedicated view for text notes, separate from link bookmarks.
- **Highlights** — View, edit, and delete highlights saved from web pages, with a direct action to open the source bookmark.
- **My Stats** — Library overview with bookmark counts by type, top domains, top tags, activity this week/month/year, and storage usage. Includes charts for bookmark sources and activity patterns.
- **Backups** — Create, download, and delete account backups. The list polls automatically while a backup is in progress and updates when it completes. Download is only available once a backup succeeds; failed backups are shown in red.

### Improvements

- Stats sidebar links navigate directly to the related command (Bookmarks, Tags, Lists, etc.)
- Backup status tags are color-coded: green for success, red for failure, gray for pending
- Error toasts show human-readable messages from the API rather than raw error bodies
- All delete actions use destructive styling
- Smart list queries are validated before submission with inline error messages

### Chores

- Updated dependencies and regenerated TypeScript definitions

## [2.1.1] - 2026-02-23

### Fixes

- **Fixed pagination sometimes stuck at 10 items after reopening the Bookmarks list**: Added a small prefetch strategy to avoid Raycast pagination deadlocks when the first page is cached and the list isn’t scrollable yet.
- **Fixed authenticated preview images not rendering in list view**: Restored the `getScreenshot` “prewarm” flow and limited it to the currently selected item to prevent performance issues.
- **Fixed BookmarkDetail always showing placeholder image for bookmarks without screenshots**: Detail view now only renders the screenshot image when an actual screenshot has been loaded, preventing the placeholder from being shown permanently.
- **Fixed stale action handlers in BookmarkItem**: Actions (favorite, archive, delete) now always operate on the latest bookmark state instead of the initial snapshot passed by the parent.
- **Fixed server-side search not re-fetching when search text changes**: The online search hook now correctly re-executes when the user updates the search query.
- **Fixed React Rules of Hooks violation in Lists view**: `getDashboardListsPage` was calling `useConfig()` inside a regular function; converted to a pure helper that receives `apiUrl` as a parameter.

### Improvements

- **More consistent toasts and translations**: Unified toast handling for common actions and improved i18n placeholder formatting; added missing translation keys used by the UI and Quick Bookmark.
- **Internal cleanup**: Strengthened API typings, removed remaining `console.*` usage in favor of structured logging, and simplified selection/state handling after list mutations (e.g., delete).
- **Type safety improvements**: `List` type now includes `parentId` and `icon` fields used by the hierarchy view; `Asset.assetType` is now an optional property instead of a `| undefined` union member.
- **Simplified `useTranslation` hook**: Removed unnecessary `isInitialMount` ref pattern; language sync is now handled by a single clean effect.
- **Removed redundant imports and calls**: Cleaned up duplicate `Bookmark` import in `quickBookmark.tsx`, unnecessary `URL` polyfill import in `apis/index.ts`, and a redundant `showHUD` call that duplicated the success toast in `createNote.tsx`.

## [2.1.0] 2025-11-21

### Big changes

- **Separated Create Bookmark and Create Note commands**: Split bookmark creation into two dedicated commands for better UX
  - `Create Bookmark` now focuses exclusively on URL bookmarks
  - New `Create Note` command for text-only notes
- **Browser Extension Integration**: Automatically prefill URL field from active browser tab
  - Uses Raycast Browser Extension API to fetch current tab URL
  - New preference to toggle automatic URL prefilling (enabled by default)
  - Gracefully handles cases where browser extension is unavailable
- **Raycast API Optimization**: Migrated to native Raycast pagination
  - Replaced manual pagination state management with Raycast's native `useCachedPromise` pagination
  - Eliminated rendering loop bug caused by stale closures
  - Optimized memory usage by removing data accumulation across pages
  - Bookmarks display in reverse chronological order (newest first)
  - **Code reduction**: 65% fewer lines across pagination hooks (384 → 136 lines)

### Chores

- Updated dependencies
- Updated ESLint configuration
- Refactored pagination hooks to use Raycast utilities

## [2.0.1] - 2025-06-28

### Changes

- Renamed to Karakeep
- Add create bookmark default type setting

## [2.0.0] - 2024-12-11

### Major Changes

- Merged and replaced with enhanced version from @foru17, bringing comprehensive features and improvements
- Added full CRUD operations for bookmark management
- Implemented tag management system
- Added AI-powered features
- Enhanced UI following Raycast's design principles
- Improved documentation and user guide

## [Pre-release Development]

### [Karakeep API Integration] - 2024-11-24

- Implemented core functionality for communicating with Karakeep API
- Added search, list, and detail view functionality
- Fix lists count display bug

### [UI Development] - 2024-11-24

- Designed and implemented main list view for bookmarks
- Created detail view for individual bookmarks

### [Settings and Preferences] - 2024-11-24

- Implemented configuration for Karakeep API host and apikey
- Added language preference setting (English and Chinese)

### [Enhanced Project Initialization] - 2024-11-24

- Set up basic project structure
- Configured development environment with TypeScript and Raycast API
- Created initial README and documentation

### [Add url as item title if title is not defined] - 2024-09-10

### [Initial Version] - 2024-08-22
