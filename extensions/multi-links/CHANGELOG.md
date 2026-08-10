# Multi Links Changelog

## [2.0.0] - 2026-08-03

- Added "Open Multiple Links History" view-mode command — replay past batches with Open All Again / Copy URLs / Pin / Delete actions
- Added "Filter Multiple Links" view-mode command — group extracted links by host/type, multi-select with ⌘T, Open Selected
- Permissive URL extraction: now matches `www.` bare hosts, bare domains with allowlisted TLDs, `mailto:` / `tel:` / `sms:`, `file://`, absolute paths with `~` expansion, markdown `[text](url)` syntax, arbitrary custom URI schemes (`obsidian://`, `vscode://`, etc.), and files with common extensions in plain text
- Added preferences: browser picker (web URLs only), open delay (ms between opens), open-any-URI-type toggle, confirm-on-many-links toggle, confirm threshold
- Added safety confirm dialog with breakdown by type + first-5 preview when batch ≥ threshold (default 10)
- Executable/installer paths (`.app`, `.dmg`, `.pkg`, `.sh`, `.command`, `.scpt`, …) always prompt a warning confirm before opening, regardless of threshold or the confirm toggle — untrusted pasted text can't silently launch code
- Parallel opens via `Promise.allSettled` chunked at 10 when `delay=0`; sequential with `setTimeout` when `delay>0`
- Friendly error messages catalog: no more raw error objects in HUD; partial-failure Toast says "Opened X of Y" with actionable wording
- History persists via `LocalStorage` (FIFO at 100 entries, per-entry items capped at 20)
- All 4 commands include an "Open Extension Preferences" action
- Added `platforms: ["macOS"]` to manifest
- Bumped `@raycast/api` to ^1.104.0, `@raycast/utils` to latest, `@types/react` to ^19
- Added Vitest test framework (104 tests covering URL extraction + openLinks behavior)

## [1.1.0] - 2026-03-08

- Added "Open Multiple Links from Clipboard" command
- Replaced `extract-urls` library with a more robust built-in URL regex
- URLs are now deduplicated (each unique URL opens only once)
- HUD now shows the count of opened links

## [1.0.1] - 2025-02-07

Fix parsing of URLs from some applications where it was not working properly.

## [Initial Version] - 2024-11-05

Initial Release of the Multi Links extension.
