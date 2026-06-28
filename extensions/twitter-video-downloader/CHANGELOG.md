# X/Twitter Video Downloader Changelog

## [2.0.0] - 2026-05-05

- New "Download Video from Clipboard" no-view command. Assign a hotkey to download instantly without opening a form.
- Multi-video tweet support: every video in a thread can now be saved in one run (configurable).
- Existing files are never overwritten; duplicates get a `(2)`, `(3)`, … suffix.
- "Download Video" now accepts an inline URL argument from Raycast root search (Tab to focus the URL pill).
- Robust URL parsing for `twitter.com`, `mobile.x.com`, query strings, `/photo/N`, `/video/N`, and missing schemes.
- Extension preferences: set a default download folder, customize filename via `{username}`, `{tweetId}`, `{index}`, `{date}` placeholders, and toggle multi-video behavior.
- Migrated to `@raycast/utils` for `useForm`, `showFailureToast`, and standardized error handling.
- Refreshed extension icon.
- Updated to `@raycast/api` 1.104, ESLint 9 flat config, TypeScript 5.8, Node 22 types.

## [1.1.0] - 2024-06-15

- Added the ability to change the download folder.

## [Initial Version] - 2023-09-05

- Initial version of the extension is released.
