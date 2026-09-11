# Better JSON Changelog

## [Automatic Deep Deserialization and New Icon] - {PR_MERGE_DATE}

- Keep the JSON input's native red validation state and error message; document Raycast's fixed label and error placement.
- Automatically deserialize nested and repeatedly escaped JSON at every depth while preserving ordinary numeric and boolean strings.
- Keep hierarchical browsing limited to the current level, with completely decoded values in every preview.
- Serialize the decoded value once using JSON.stringify semantics, without separately encoding each child or double-encoding the output.
- Use iterative decoding and preview generation to support deeply nested JSON beyond the JavaScript call stack; keep the original input available.
- Replace the old extension icon with a custom 512×512 PNG featuring JSON braces and a data node.

## [Faster Input and Hierarchical Browsing] - {PR_MERGE_DATE}

- Open valid clipboard JSON directly, restore unfinished drafts first, and preserve original data types by default.
- Browse objects and arrays one level at a time with native back navigation and paged children.
- Show complete paths and accurate counts in global search; retain document actions when no fields match.
- Make copy scope explicit, group less frequent output formats in Copy As, and use Read Clipboard consistently in both views.
- Make nested-string conversion reversible, retain the original source, and show conversion and preview/search limits.
- Save unfinished edits locally, show inline parse errors, and unwind old navigation pages before replacing a document.
- Add regression tests for parsing, clipboard/draft entry, search limits, paths, and navigation replacement.

## [Raycast v2 Compatibility] - {PR_MERGE_DATE}

- Updated `@raycast/api` and its CLI to `^2.2.0` for Raycast v2.
- Declared the CLI's Node.js requirement of 22.22.2 or later.
- Documented rebuilding local extensions after migrating to Raycast v2, including recovery from missing executable errors.

## [Redesigned JSON Workbench] - {PR_MERGE_DATE}

- Reworked the command into a JSON workbench with a multiline input form and searchable structure browser.
- Replaced the old parse/stringify mode picker with node-level actions for pretty JSON, compact JSON, escaped JSON strings, paths, and paste.
- Added a command preference and in-view action for showing the right-side metadata panel, which is hidden by default.
- Added keyboard shortcuts for filter dropdown activation, direct type filters, metadata toggle, copy, paste, edit, new input, and preferences actions.
- Updated Raycast dependencies to `@raycast/api@^1.104.19` and `@raycast/utils@^2.2.6`.
- Removed JavaScript expression evaluation from stringify mode.

## [Initial Version] - 2024-12-19

- Added parse mode for converting JSON strings to JavaScript objects.
- Added stringify mode for converting JavaScript-like data to JSON strings.
- Added support for quoted JSON strings and nested JSON strings.
- Added real-time processing, formatted result previews, and copy actions.
