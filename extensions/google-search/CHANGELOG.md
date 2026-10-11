# Google Search Changelog

## [Fix Suggestion Errors] - {PR_MERGE_DATE}

- Fix "Premature close" error toast appearing while typing quickly
- Fix loading indicator staying on after a failed suggestion request
- Searches from "Google Search Selected Text" are no longer saved when search history is turned off
- Trim surrounding spaces from selected text before searching, and merge older history entries that differ only by those spaces
- Add a Copy Error action to failure toasts
- Move "Use Clipboard Fallback" to the Google Search Selected Text command settings
- Show each result once, even when a suggestion matches the search or a history entry
- Move a search back to the top of history when it is opened again
- Wait for a pause in typing before fetching suggestions
- Mark Remove from History and Clear All History as destructive actions
- Add an optional Query argument, and start from the typed text when used as a fallback command
- Replace `node-fetch` and `iconv-lite` with the built-in `fetch`
- Update dependencies

## [Update] - 2026-07-13

- Update Google G icon

## [Add Keyboard Shortcuts] - 2026-07-10

- Add common keyboard shortcuts to Copy Suggestion, Remove from History, and Clear All History actions
- Fix Remove from History shortcut to use the standard Remove shortcut instead of Duplicate

## [Update] - 2026-01-26

- Fix issue with search text containing special characters

## [Windows] - 2025-11-06

- Release extension for Windows

## [Update] - 2025-02-22

- Add clipboard fallback preference for selected text searches

## [Update] - 2024-11-21

- Add a command to search Google with the selected text

## [Update] - 2024-08-06

- Add an action for setting result as search text

## [Update] - 2022-12-10

- Fixes an issue that caused the extension to crash

## [Update] - 2022-12-09

- Add an action for copy suggestion to clipboard
- Add a toggle for search history in preferences
- Always have current search at top [Google Search] Always have current search at top
- Improve searching of history Google Search: Improve searching of history
