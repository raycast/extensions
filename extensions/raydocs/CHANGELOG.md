# RayDocs Changelog

## [Section Filtering, Offline Cache, and Markdown Actions] - 2026-09-17

- Filter the list by documentation section with a new dropdown, and tell sections apart at a glance — each one now has its own icon and colour
- Once a page has been opened, it reappears instantly from a local cache and refreshes in the background
- Frequently opened pages rise to the top of their section
- Added "Copy Markdown URL" (⌘⌃C) and "Copy as Markdown" (⌘⇧M), which copies the rendered page text — served straight from a local copy for a page you read recently, and falling back to that copy when the docs cannot be reached
- Added "Refresh Docs" (⌘R) to fetch the table of contents again on demand
- A failed load now explains what happened and offers a retry instead of showing an empty list, and a failure while cached pages exist keeps showing them
- Fixed page descriptions rendering as a broken one-cell table; they now read as a lead-in quote
- Fixed property tables being replaced by a large warning block — they now link to the exact section of the published documentation
- Fixed code samples being rewritten: image paths inside fenced blocks and inline code are left untouched
- Fixed raw HTML links leaking into the page as unrendered tag soup

## [Documentation Preview and AI Integration] - 2025-02-28

- Add inline documentation preview
- Implement AI-assisted documentation lookup

## [Upgrade dependencies to newest versions] - 2024-02-29

- Implement absolute paths

## [Added RayDocs] - 2023-03-21

Initial version code
