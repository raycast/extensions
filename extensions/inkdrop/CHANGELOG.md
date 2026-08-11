# Inkdrop Changelog

## [New Features & Improvements] - 2026-03-02

- Added Quick Look action for full note preview
- Added rich actions menu: Copy Note Content, Copy Note Title, Paste Note Content, Copy Markdown Link, Copy Inkdrop Link
- Added sort dropdown (Updated/Created/Title, ascending/descending)
- Added delete note with confirmation dialog
- Added "Open in Inkdrop" toast action after note creation (Cmd+O)
- Added colored status icons matching Inkdrop's native UI
- Added colored tag icons in Create Note form
- Added colored tag pills in note metadata panel
- Added markdown preview with smart truncation and code fence handling
- Added truncation indicator accessory for large notes
- Added relative timestamps in metadata
- Added error empty view with "Open Extension Preferences" recovery action
- Replaced `node-fetch` and `luxon` dependencies with native APIs and `@raycast/utils`
- Migrated data fetching to `usePromise` with `failureToastOptions`
- Eliminated N+1 API calls for books/tags in metadata components
- Improved form validation using `useForm` with `FormValidation.Required`
- Improved error handling with `showFailureToast` and actionable recovery
- Aligned keyboard shortcuts with Raycast conventions
- Throttled search to reduce API calls
- Alphabetically sorted notebooks in dropdown
- Fixed typo in Create Note command description
- Fixed `parentBookId` type to be optional

## [Initial Version] - 2022-07-05

- Search Notes command
- Create Note command
