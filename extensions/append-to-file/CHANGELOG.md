# Changelog

All notable changes to this project will be documented in this file.

The format follows Keep a Changelog and this project uses Semantic Versioning.

## [Unreleased]

- Added persistent search cache with stale-while-revalidate loading behavior.
- Parallelized Spotlight root search and partial fallback scanning for failed roots only.
- Parallelized stale-file existence filtering.
- Added preference shortcuts in common failure states.
- Added release metadata files (`LICENSE`, `CHANGELOG.md`).

## [1.0.0] - 2026-02-15

- Initial feature-complete release.
- Commands for clipboard append, text append, quick append, undo last append, and open last appended file.
- Extension allowlist enforcement and configurable search preferences.
- Atomic writes and UTF-8/UTF-16 encoding preservation.
- Clipboard history handling and text-only filtering.
- Append styles (raw, bullet, quote, timestamp) and insert position control.
