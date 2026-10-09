# Anki Changelog

## [Custom Notes and AI Tools] - {PR_MERGE_DATE}

- Improved note creation with custom Anki note types, ordered fields, and optional fields.
- Fixed media attachments and support for all accepted audio and video formats.
- Kept the selected deck and note type after adding a note or clearing the form.
- Prevented stale note type selections from crashing the form.
- Fixed reversed and cloze questions by using Anki's rendered card templates.
- Added native Anki review for typed answers and image occlusion cards.
- Prevented repeated grading and premature repetition of future learning cards.
- Stopped automatic retries of writes whose outcome cannot be confirmed.
- Clarified that deleting a note removes all associated cards.
- Fixed stale media filters and kept deck creation forms open after errors.
- Added note editing and new-tag entry for existing and custom note types.
- Added AI tools to list decks and note types, search notes, create decks and notes, and edit fields and tags with confirmation.
- Made card searches reuse matching IDs across pages and show Anki's actual error messages.
- Kept Browse Cards results visible while the media folder refreshes and corrected loading and error states.
- Fixed connection reuse failures with AnkiConnect and updated dependencies.

## [Security Maintenance] - 2026-02-13

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
