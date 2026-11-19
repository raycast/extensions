# Day One Changelog

## [2.0: Rebuilt on the New Day One CLI] - 2026-11-13

- Version 2.0 needs the new Day One CLI and a sign-in, in place of the CLI built into the Day One Mac app. Run Doctor sets both up. Add Entry's Save and Open action is gone; open an entry from Search Entries instead.
- Search your entries by meaning (on a Mac) with the new Search Entries command, filter by journal, tag, or place, and read them in a sidebar or in full with Go to Entry, no Day One app needed.
- Add to Daily Chat sends a message to today's Daily Chat straight from Raycast's search bar. On a Mac, the confirmation offers to open it in Day One.
- Ask Raycast AI about your journal: search entries, read one (up to 100,000 characters), or have it write an entry after you confirm.
- Run Doctor installs the CLI for you, signs you in, adds your encryption key, renames the legacy Mac CLI, and on a Mac rebuilds the search index in the background.
- Sync Day One downloads and uploads entries and shows a running count, even on a first sync of thousands of entries.
- Add Entry now writes through the new CLI, uploads after you save (a preference can turn this off), keeps your unsent text and journal as a draft, and lists the journals you use most first. It works on Windows and without the Mac app.
- Fixed a security problem: entry text was passed through a shell and could run commands. Text now goes to the CLI directly.
- The extension icon now matches the current Day One app icon.

## [Support the renamed dayone CLI] - 2026-09-09

- Fixed the "Day One CLI Missing" error on Day One for Mac 2025.19+, which renamed the CLI from `dayone2` to `dayone`. The extension now detects and uses whichever CLI is installed.

## [Bug fix] - 2026-05-19

- Fixed CLI detection when Raycast does not inherit the terminal PATH.

## [Bug fix] - 2025-03-17

- Fixed an issue where adding an entry when the journal name contains a space character causes an error.

## [Feature] - 2024-02-06

- Capture a complete timestamp when creating an entry, instead of just the date

## [Bug fix] - 2024-01-24

- Error handling for when the CLI gets out of sync with the desktop application. Instead of saying "CLI not found", the extension now says "CLI out of sync, launch the desktop application"

## [Bug fix] - 2023-12-13

- Improved detection logic for the `dayone2` CLI

## [Initial Version] - 2023-11-15
