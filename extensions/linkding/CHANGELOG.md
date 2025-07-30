# Linkding Changelog

## [Fixes] - 2025-06-26

- fix!: use server-side filtering to handle large bookmark counts
- fix!: remove Firefox-specific code (doesn't work)
- fix: allow clearing metadata when automatically set

## [Fix] - 2025-05-27

- fix: use more reliable AppleScript to get Firefox URL

## [Fix & Feature] - 2025-05-26

- feat: save current browser tab
- fix: update filtered bookmarks on delete

## [Refactor & Features] - 2025-04-16

- refactor!: use raycast fetch API (removes "Ignore SSL" option)
- fix: surface API errors in UI
- fix: handle bookmarks without tags
- feat: cache bookmarks locally
- feat: add edit shortcut
- feat: fuzzy filter search results locally
- refactor!: use standard keyboard shortcuts
- refactor!: remove multiple account handling

## [Enhancements] - 2025-03-20

### Create Bookmark

- feat: add option to create bookmarks as unread by default
- feat: hide account dropdown if only one account
- feat: allow adding tags when creating bookmark

### Search Bookmarks

- feat: allow customizing search results display

## [Fixes & Enhancements] - 2025-02-20

### General

- fix: API would not be called if saved with trailing slash (we now strip trailing slash before saving) [Issue ref: [#16999](https://github.com/raycast/extensions/issues/16999)]
- Simplify "types/linkding-shortcuts"

### Create Bookmark

- `useForm` hook for control
- Add placeholders and info where relevant
- fix: would always show Success Toast even on fail

### Search Bookmarks

- make "Delete" `ActionStyle` _Destructive_
- fix: after delete, Success Toast was always shown even on fail
- Show `Toast`s throughout "Delete" in search-bookmarks
- Show proper "isLoading" in search-bookmarks (`usePromise` hook)
- Add `Icon` to search-bookmarks items

### Manage Account

- `Action` to open manage-account when no accounts added
- `useForm` hook in manage-account for better form control
- Add `Icon`s in manage-account

## [Copy Shortcut & Creation and Deletion of Bookmarks] - 2023-11-04

- Adds action and shortcut to copy bookmark to clipboard
- Adds the ability to create and remove bookmarks
- Fetches website metadata while creating a bookmark to automatically fill bookmark creation form
- Changes keyboard shortcuts for delete and copy actions
- Updates to racast@1.60.0

## [Multi-Linkding Instances & Axios cancellation toast fix] - 2023-05-29

- Fixes a bug, where axios cancellations would be shown as an error toast message, Thanks @vkhitrin
- Removes usage of the preference system for Linkding account
- Adds System for multi-linkding Instances
- Ability to search through Bookmarks from different Linkding Instances.

## [Redeploy Project and small fixes] - 2023-04-03

- Redeploys project to raycast store
- Uses URL as fallback title

## [Initial Version] - 2023-04-02

- Adds ability to search through bookmarks
- Adds ability to open searched bookmarks in the browser
