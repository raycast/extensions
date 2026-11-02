# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Find files and folders in macOS Open/Save dialogs and paste a selected absolute path back into the original dialog; the user remains in control of Open/Save.
- Build a persistent file and folder index manually using `fd`; searches never trigger background scans.
- Search indexed paths using `fzf`, then open results, reveal them in Finder, use Quick Look, or copy paths.
- Choose indexed folders, inspect index status, and use optional privacy-safe developer diagnostics.
- Show actionable Homebrew installation guidance if `fd` or `fzf` is unavailable.

Inspired by [Listary](https://www.listary.com/). Based on Raycast's MIT-licensed [Fuzzy File Search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
