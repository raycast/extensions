# Ego Lite Raycast Extension Design

## Summary

Build a macOS-only Raycast extension for Ego Lite with three focused commands:

1. Create a new blank tab.
2. Search bookmarks.
3. Search browsing history.

The extension is intended for local use first, while following Raycast Store conventions for project structure, metadata, documentation, privacy disclosure, linting, and build quality. It operates only on the user's normal Ego Lite browser windows and data. It does not use, enumerate, claim, switch, or otherwise interact with AI-created Task Spaces.

The project is a standalone Raycast extension repository.

## Goals

- Make the three frequent browser actions available as first-class Raycast commands.
- Keep command launch and search latency low by using Ego Lite's native Chromium interfaces.
- Read browser data locally and never upload bookmarks, history, or queries.
- Keep Ego Lite-specific paths and automation details behind one adapter boundary.
- Produce a codebase that can later be submitted to the Raycast Store without architectural rework.

## Non-goals

- Searching, focusing, closing, or otherwise managing existing tabs.
- Unified search across tabs, bookmarks, history, and search engines.
- Search-engine suggestions or web-search fallback.
- Creating or managing regular, incognito, guest, or named windows as standalone commands.
- Supporting Ego Lite AI Task Spaces or the `ego-browser` CLI.
- Supporting browsers other than Ego Lite.
- Publishing to the Raycast Store as part of the first delivery.

## Confirmed Environment and Integration Surface

The installed Ego Lite 0.4.5.8 application provides:

- macOS bundle identifier `com.citrolabs.ego.lite`.
- A Chromium-compatible AppleScript dictionary with application, window, and tab objects.
- A direct-launch `ego` URL scheme; `ego://newtab` opens a new normal user tab.
- Writable `active tab index` and support for creating windows and tabs.
- Chromium-style local user data under `~/Library/Application Support/Citro Labs/ego lite`.
- A Chromium `Local State` file and per-profile `History`, `Bookmarks`, or `AccountBookmarks` files.

The open-source `citrolabs/ego-lite` repository contains the agent automation harness rather than the closed-source browser application. The Raycast extension therefore uses the installed application's standard macOS and Chromium surfaces, not the agent automation bridge.

## Chosen Approach

Use native macOS and Chromium integration:

- Raycast application discovery plus macOS LaunchServices for installation detection and URL routing.
- `ego://newtab` for creating a blank user tab and the Ego Lite bundle identifier for opening selected HTTP URLs.
- `Local State` for profile discovery.
- `AccountBookmarks` or `Bookmarks` JSON for bookmark search.
- Raycast `useSQL` for read-only history queries and Full Disk Access priming.

Rejected alternatives:

- Ego Lite's declared Chromium AppleScript tab API: live testing on 0.4.5.8 showed that creating a tab could block the application's Apple Event queue, while LaunchServices routing remained responsive.
- `ego-browser` CLI: introduces process startup latency and Task Space ownership semantics that are undesirable for a daily Raycast command.
- Chromium browser extension plus native messaging: provides capabilities beyond the three-command scope at substantially higher installation and maintenance cost.

## Architecture

### Raycast command entry points

The manifest exposes exactly three commands:

- `new-tab`: no-view command that creates and selects a blank tab.
- `search-bookmarks`: view command that renders a searchable bookmark list.
- `search-history`: view command that renders a searchable history list.

### Ego Lite adapter

A small adapter owns all browser-specific behavior:

- Application name and bundle identifier.
- Ego Lite application and user-data paths.
- Installation detection.
- LaunchServices routing through the Ego Lite bundle identifier.
- Creating a blank normal user tab through `ego://newtab`.
- Opening a validated HTTP or HTTPS URL in a new normal user tab.

Command components do not embed application discovery or filesystem paths directly.

### Profile resolver

The resolver reads `Local State` and chooses a profile using this order:

1. `profile.last_used` when it is a non-empty string.
2. The first key in `profile.info_cache`.
3. `Default`.

The resolver returns paths only. It never creates, edits, or repairs browser profile data.

### Bookmark repository

For the selected profile, the repository:

1. Reads `AccountBookmarks` when present and valid.
2. Uses its entries when it contains at least one URL bookmark.
3. Falls back to the legacy `Bookmarks` file otherwise.
4. Recursively flattens URL nodes while preserving a human-readable folder path.

The flattened model contains ID, title, URL, folder path, and date-added data where available. Search is local, case-insensitive, and matches title, URL, or folder path.

### History repository

The history command uses Raycast `useSQL` against the selected profile's `History` database. Queries:

- Return the most recent visit per URL.
- Restrict results to HTTP and HTTPS URLs that can be reopened safely.
- Sort by Chromium's `last_visit_time` descending.
- Limit empty searches to 100 results.
- Apply a two-character minimum before adding a search filter.
- Split a query into non-empty terms and require every term to match either title or URL.
- Escape SQL string content and `LIKE` wildcard characters.

Chromium timestamps are converted to local time in SQLite.

## Command Behavior

### New Tab

1. Close the Raycast main window.
2. Ask macOS LaunchServices to open `ego://newtab` with the Ego Lite bundle identifier.
3. Ego Lite activates, then creates and selects one blank normal user tab, creating a normal window when needed.

The command does not call `ego-browser` and does not address a Task Space by name or ID.

### Search Bookmarks

- Show all bookmarks when the query is empty.
- Filter immediately as the user types.
- Show a locally generated domain icon, title, host, and folder path.
- Use a generic link icon for unsupported or invalid URL schemes.
- Make opening the selected URL in a new Ego Lite tab the default Enter action.
- Provide secondary actions to copy the URL, copy the title, and copy a Markdown link.

### Search History

- Show the 100 most recently visited unique HTTP or HTTPS URLs when the query is empty.
- Search title and URL after the query reaches two characters.
- Show a locally generated domain icon, title, host, and last-visited time.
- Make opening the selected URL in a new Ego Lite tab the default Enter action.
- Provide secondary actions to copy the URL, copy the title, and copy a Markdown link.

## Error Handling and Permissions

### Ego Lite is not installed

Display a clear error state or toast and offer an action to open the Ego Lite website. Do not attempt to install the browser automatically.

### Full Disk Access

Use `useSQL` permission priming for history access. The explanation states that Full Disk Access is required only to search the user's local Ego Lite browsing history.

### Missing or malformed profile state

Fall back to the `Default` profile. If the required data file remains unavailable, show an empty or error view appropriate to the command. Never modify `Local State`.

### Missing bookmarks

If neither bookmark file exists or neither contains URL bookmarks, show a friendly empty state indicating that Ego Lite has no readable bookmarks yet.

### Locked or temporarily unavailable history database

Rely on Raycast's read-only `useSQL` behavior and perform at most one delayed revalidation for a transient query failure. Do not quit Ego Lite, copy its database, or alter locking behavior.

### Input safety

- Escape SQL quote characters and `LIKE` metacharacters.
- Validate that URLs use HTTP or HTTPS before generating a domain icon or passing a selection to LaunchServices.

## Privacy

- All bookmark and history processing happens locally.
- The extension has no analytics, telemetry, remote API, or search-suggestion request.
- No browsing data or query text leaves the Mac.
- Result icons are generated locally from domain names; remote favicon providers are intentionally excluded.
- README and Raycast metadata explain why local browser files and Full Disk Access are needed.

## Testing Strategy

### Automated verification

- Raycast production build succeeds.
- Raycast lint succeeds without warnings introduced by the extension.
- Pure logic tests use fixtures and temporary paths rather than real browser data.
- Tests cover:
  - Profile selection and `Default` fallback.
  - `AccountBookmarks` preference and `Bookmarks` fallback.
  - Recursive bookmark flattening and folder-path generation.
  - Bookmark matching by title, URL, and path.
  - History query generation, multi-term behavior, and escaping.
  - URL validation and copy-format generation.

### Manual acceptance verification

- `New Tab` works when Ego Lite is stopped, running with a user window, and running without a user window.
- Bookmark search handles populated and empty data and opens the chosen URL.
- History search presents the Full Disk Access flow, recent results, filtered results, and opens the chosen URL.
- Copy URL, title, and Markdown actions produce the expected output.
- No command creates, selects, claims, or interrupts an AI Task Space.
- The extension imports from source into Raycast and all three commands remain usable after the development process exits.

## Deliverables

- Raycast extension source code in the project repository.
- Store-compatible manifest containing only the three approved commands.
- Extension icon and metadata assets.
- README with installation, permissions, usage, privacy, and troubleshooting sections.
- Automated tests for pure data and query logic.
- Successful build, lint, test, and local smoke-test evidence.

## Acceptance Criteria

The first delivery is complete when:

1. The extension can be imported into the user's Raycast installation.
2. Each of the three commands behaves as specified against the installed Ego Lite browser.
3. Search results open in a new tab in a normal user window.
4. Browser data is read locally without modification or transmission.
5. AI Task Spaces remain outside the integration boundary.
6. Build, lint, and automated tests pass.
7. The repository contains clear installation and permission documentation suitable for later Store submission.
