# Obsidian Smart Capture Changelog

## [Fix Crash on Unreachable Vaults] - 2026-10-13

- Capture no longer crashes when a vault's `.obsidian/community-plugins.json` cannot be read, for example a vault on an offline network share or cloud drive (`ETIMEDOUT`) or a malformed file. Such a vault is treated as not having the Advanced URI plugin ([#31340](https://github.com/raycast/extensions/issues/31340))

## [New features] - 2025-03-10

- Add support for generating summary using AI
- Add support for including page content in the note

## [Initial Version] - 2023-08-17
