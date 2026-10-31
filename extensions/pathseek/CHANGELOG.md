# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Build a persistent file and folder index on demand using `fd`; PathSeek never schedules background scans.
- Find indexed paths with `fzf`, then open, reveal in Finder, Quick Look or copy paths.
- Select files or navigate to folders in macOS Open/Save dialogs using an explicit path-paste action.
- Choose indexed folders, inspect index status and use optional privacy-safe developer diagnostics.
- Show actionable Homebrew installation guidance if `fd` or `fzf` is unavailable.

Inspired by [Listary](https://www.listary.com/). Based on Raycast's MIT-licensed [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
