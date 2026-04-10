# Finder File Actions Changelog

## [Fix copy-to-folder command] - 2026-04-02

- Fixed "Copy to Folder" failing when "Move to Folder" command is disabled
- Fixed large same-volume moves falling back to slow streamed copy instead of instant rename
- Fixed unhandled read stream errors during large file copies
- Fixed deleted/renamed pinned folders staying stale until 24h cache expires
- Updated @raycast/api to 1.104.11, @raycast/utils to 1.19.1

## [Initial Version] - 2025-04-02
