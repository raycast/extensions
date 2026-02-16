# Anki Changelog

## [Security Maintenance] - {PR_MERGE_DATE}

- Removed unused `npm-check-updates` dependency.
- Reduced transitive dependency surface (including removal of transitive `tar` usage) to address security advisories.

## [Bug Fixes] - 2024-12-06

- Fixed turndown to support markdown syntax when rendering card content

## [Improvements] - 2024-10-07

- Made `model` and `deck` dropdowns remeber last selected item
- Added preference to `AddCard` command to permit empty field values.

## [Improvements] - 2024-09-11

- Added pagination to commands **Decks** and **BrowseCards** (should resolve out-memory-errors for larger card collections)
- Clarified information in the troubleshooting steps

## [Initial Version] - 2024-08-06
