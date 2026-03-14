# AIDrop Design

**Date:** 2026-03-13

## Goal

Build a Raycast extension that lets the user select recent files from `~/Downloads` and copy them to the macOS pasteboard in the same shape Finder uses, so they can be pasted into ChatGPT, Gemini, Claude, and similar apps.

## Scope

- Create a Raycast command named `copy-recent-downloads`
- Read visible files from `~/Downloads`
- Sort them by modification time and show the most recent items
- Show the 10 most recent files directly in a Raycast list
- Allow per-row selection toggling with `Space`
- Copy all selected files with `Enter`
- Invoke a compiled Swift helper that writes file URLs to the general pasteboard
- Keep the recent-file loading logic testable outside the Raycast UI

## Architecture

The extension will keep UI and business logic separate. The Raycast command will only manage loading state, rendering, list selection, and submission, while small library modules will scan and sort recent files from a given directory and manage selected-path state. This gives us a clean place to add tests without depending on Raycast runtime behavior.

The native clipboard behavior will live in a Swift binary under `bin/`. The React command will call that helper with the selected file paths. The helper will write `file://` URLs to the pasteboard and also publish the legacy filename payload for broader app compatibility.

## File Layout

- `package.json`: Raycast manifest, scripts, and dependency metadata
- `src/copy-recent-downloads.tsx`: command UI
- `src/lib/recent-files.ts`: file loading logic
- `src/lib/selection.ts`: list selection state helpers
- `src/lib/recent-files.test.ts`: behavior tests for sorting and filtering
- `bin/finder-copy-files.swift`: native helper source
- `bin/finder-copy-files`: compiled helper binary
- `tsconfig.json`: TypeScript configuration for Raycast + tests

## Error Handling

- Empty selection shows a failure toast instead of calling the helper
- Helper execution failures surface in a failure toast with the process error message
- Missing or unreadable downloads entries will fail the load operation; Raycast will stop showing the loading state and surface no selectable files until the issue is fixed

## Testing

The recent-file loader and selection helpers will be implemented test-first with Node's built-in test runner. Tests will cover hidden-file filtering, file-only filtering, descending modification-time sort order, the item limit, `Space`-style toggle behavior, and preservation of visible display order during copy.

The Swift helper will be validated by compiling it with `swiftc`. We will not automate pasteboard assertions in this pass because that would require a heavier macOS integration test harness than the feature needs.

## Follow-Up Upgrades

- Increase the recency window from 10 files to 30
- Add extension filters
- Add a recent screenshots mode
- Add an action to open selected files
- Add service-specific follow-up automation later
