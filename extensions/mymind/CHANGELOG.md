# mymind Changelog

## [Context-Aware Saves] - 2026-08-12

- Added an opt-in `Context Detection` preference, off by default. With it disabled the command behaves exactly as before — clipboard first, then Finder — and the browser is never queried, so macOS never asks for Automation permission
- When enabled, `Save to mymind` prefills from the frontmost app: selected text is preselected as a Note, a selected URL as a Link, and when nothing is selected in a browser, the active tab's URL is used
- Read the active tab's URL straight from the browser via Apple Events — only that one value, never page contents, titles or the list of open tabs — which needs the one-time "control <Browser>" Automation permission instead of a browser extension's broader per-site page-content access
- Support Safari plus every Chromium-based browser — Chrome, Edge, Brave, Opera, Vivaldi, Chromium, Arc, Dia, ChatGPT Atlas, and Comet — and fall back to unlisted browsers by reading their own scripting definition, so new browsers work without a code change
- Run context detection once per launch: `getSelectedText` reads the selection through the system clipboard, so concurrent calls interfered and results flipped between the selection, the tab URL and stale clipboard history
- Keep the form fast by reading the tab and the selection in parallel

## [Fix Save Form Prefill and Refresh AI Tags] - 2026-08-10

- Fixed `Save to mymind` not prefilling detected content: the form relied on `defaultValue` with a changing `key` to remount, but `defaultValue` is only applied once per component lifecycle, so values resolved after mount (such as clipboard detection) never reached the fields. They are now controlled inputs
- Refresh the item detail view after saving so mymind's automatic AI tags appear without a manual reload

## [Faster Saves from Clipboard] - 2026-07-20

- Updated `Save to mymind` to detect links, notes, images, videos, and other supported files from recent clipboard history, then select the matching type and prepopulate the form

## [Rebuild Around Official API] - 2026-07-08

- Rebuilt the extension around the official mymind API
- Added Read Only and Full Access modes that hide saving and editing actions when the configured key can't modify your library
- Renamed the access key preferences to `Key ID` and `Your Private Key` to match mymind's Extensions page
- Added `Search Spaces` and `Search Tags`
- Expanded `Save to mymind` into a unified save flow for links, notes, and file uploads
- Added first-class bulk file uploads with shared tags, space assignment, attached notes, and removable file selection
- Added automatic file-mode detection from Raycast launch context and Finder selection when supported files are selected
- Added editing actions for renaming, retagging, moving between spaces, and editing notes
- Added space management actions for creating, editing, and deleting spaces
- Added richer detail views, related item browsing, and improved previews
- Added type-aware list and media grid views with a configurable media grid card size
- Added a quick-access mymind menu bar for save, search, and launch actions
- Added AI Extension tools so you can search, save, organize, and manage your library by chatting with `@mymind`, with confirmations and full-access gating for write and destructive actions
- Constrained AI space colors to mymind's fixed palette (accepting color names) and added a `list-space-colors` tool to enumerate the options
- Made creating a space with AI frictionless: it no longer fails or asks for a color first—a palette color is auto-assigned when none is specified and reported back, and a new `update-space` tool lets you rename or recolor a space afterwards

## [Added Windows Support] - 2025-06-03

- Added support for Windows platform.

## [Initial Version] - 2025-03-17
