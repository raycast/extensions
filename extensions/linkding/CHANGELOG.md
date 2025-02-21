# Linkding Changelog

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
