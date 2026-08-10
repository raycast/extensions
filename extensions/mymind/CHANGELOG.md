# mymind Changelog

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
