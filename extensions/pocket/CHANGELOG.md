# Pocket Changelog

## [Add Alert to Go to Export] - 2025-06-30
- EmptyView when no bookmarks
- URL in create is now Required
- Add an Alert to let users know Pocket is shutting down

## Handle Deleted Items - 2025-03-13
- Hide deleted items in the `Search Bookmarks` command

## [Improved Type Safety] - 2024-11-23
- Added `Preferences` type to `preferences.ts`
- Added `zod` for runtime validation and type inference
- Added fallback values for `List.Item`

## [Add Website Favicons] - 2024-08-31
- Add website favicons to bookmarks in the `Search Bookmarks` command

## [Fix Bookmark Creation] - 2024-07-20
- Update code to match new Pocket API requirements for bookmark creation

## [Tag Improvements] - 2024-01-25
- Show tag icon in the `Search Bookmarks` command
- Improve tag creation caching and performance
- Title case tags in the `Search Bookmarks` command

## [OAuth & Improvements] - 2024-01-14
- Add OAuth integration for Pocket
- Improve titles for specific open commands
- Add content type filter for the `Search Bookmarks` command
- Update extension icon to a rounded version
- Deprecate browser app and other settings

## [UX, Performance & Commands] - 2023-10-15
- Cache results for faster search
- Use native Pocket search to avoid rate-limits
- Add `Menu Bookmarks` command for quick access to the latest bookmarks
- Add `Create Bookmark` command for manual creation
- Add `Save Current Tab` command for creating bookmarks from URLs
- Rename `Random Bookmark`, `Latest Bookmark` and `Save Clipboard` commands
- Add confirmation modal on bookmark delete
- Add Pocket tags filter to `Search Bookmarks` command
- Add `Copy as Markdown URL` option in `Search Bookmarks`

## [Filters & Commands] - 2022-03-19
- Add `All`, `Unread` and `Archived` filters for the `Search Bookmarks` command
- Add new preference to select default read state filter
- Rename `Random Bookmark` command to `Open Random Bookmark`
- Add `Open Latest Bookmark` command to open the latest unread bookmark
- Add `Create Bookmark from Clipboard` command to create a bookmark from the clipboard contents

## [Categories & Screenshots] - 2022-03-12
Add categories and screenshots for the store

## [Added Pocket] - 2022-03-02
Initial version code