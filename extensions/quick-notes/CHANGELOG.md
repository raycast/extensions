# Quick Notes Changelog

## [Bugfix] - 2025-08-04

- Fix note opening externally if note title contains space

## [New Command] - 2025-06-26

-  Open Note Externally

## [New Commands] - 2025-04-08

- 3 new commands to use outside of `View Notes`: `Create Note`, `Create Tag`, `Search Notes`
- Can now use these commands to intake note from clipboard, selected text, etc. using Raycast Quicklinks

## [AI Summary] - 2024-08-03

- Raycast Pro users can now summarize notes using AI
- Summarize a note using `⌘ + I`
- Clear note summary using `⌘ + ⇧ + I`

## [Performance] - 2024-07-18

- Reduce lag when loading and searching

## [Bugfix] - 2024-06-07

- Fix to respect sort when filtering by tag
- Fix bug where search wasn't working at all

## [Better Tag Management] - 2024-05-29

- New quick add / remove tags using `⌘ + T`
- Quick tag sort from dropdown in search
- Updated new tag shortcut to `⌘ + ⇧ + T`
- Updated filter tag to `⌘ + F`
- Better word count in metadata to account for MD

## [Bugfix] - 2024-05-24

- Remove create button on the sort action, unintended

## [Metadata Menu and Sort] - 2024-05-23

- New note metadata menu to show tags and other details for a note using `⌘ + M`
- Sort straight from the notes list instead of preferences using `⌘ + S`
- Both these new features save your settings in Cache
- Removes sort from preferences

## [Copy Action] - 2024-05-08

- New `Copy to Clipboard` action on note body using `⌘ + ⇧ + C`
- Update README and metadata images accordingly

## [2-Way Folder Sync] - 2024-04-25

- New `Sync with Folder` command (disabled by default) to allow for syncing existing `.md` files into quick notes
- Remove tag and title from body in synced folder as it's not that useful
- Use Mac trash instead of permanent delete of files in synced folder

## [New Sort Feature] - 2024-04-11

- Categorize notes by tags on the main page by updating `Sort Notes By` in extension settings
- Fixed a bug where tags were not deleted on the note itself when deleting a tag
- Switch filter and view tag commands
- Update README

## [Initial Version] - 2024-02-29
