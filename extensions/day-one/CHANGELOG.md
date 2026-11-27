# Day One Changelog

## [Shared Search Model] - 2026-11-26

- Needs Day One CLI 0.23.1 or newer; Run Doctor offers the update. The search model now lives in the CLI's own folder, shared with the CLI in Terminal and AI agents, instead of a second 90 MB copy for Raycast. The copy already downloaded moves there, so nothing downloads again.
- The Agent Skills help page can remove the skills (Remove Agent Skills, after a confirmation), and Run Doctor's action to open it is now View README.
- Run Doctor's Search Index row says when entries are missing from search by meaning and leads with Rebuild, then clears once the rebuild finishes. Entries the CLI can't index are noted instead of asking you to rebuild again.
- Check Again says what it found, including when nothing changed.
- Copy Doctor Report adds the extension's own checks (CLI path and latest version, search model folder, agent skills, background sync) to the CLI's report, and works even when the CLI's checks can't run.

## [Update Check for the Day One CLI] - 2026-11-25

- Run Doctor checks npm for a newer Day One CLI. When there is one, the CLI row shows the new version and offers to update to it; when yours is the latest, it says so and no longer offers an update.
- Installing or updating the CLI can't run twice at once. Reopening Run Doctor mid-update shows the update in progress instead of offering another, and checks the CLI again when it finishes.

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
