# Apple Notes Changelog

## [View Random Note command] - 2025-06-30

Add a new command for viewing a random note from a user's note library.

## [Add Chinese Pinyin input match] - 2025-06-30

When using the Chinese Pinyin input method, the note title, folder name, and snippet are now matched using Pinyin.

## [Bug Fix Update] - 2025-05-22

Add a preference for choosing the maximum number of notes to allow AI to use to prevent issues with running out of memory loading all notes.

## [Bug Fix Update] - 2025-03-06

Fix for app crashing when user has not granted disk access.

## [Bug Fix Update] - 2025-02-27

Fix for 'JS heap out of memory error' reported by a user in issue #17137.

## [✨ AI Enhancements] - 2025-02-21

## [Bug Fix Update] - 2024-11-22

Fix "Create note" from empty "Search notes" view, where a new note would be created with random characters instead of value from searchbar.

## [Bug Fix Update] - 2024-06-22

Fix Add Text to Note hooks rendering issue.

## [View Selected Note command] - 2024-06-17

Add a new command allowing users to see the currently selected note from within Raycast. This can be handy if you want to open note backlinks for example.

## [Change AI model for notes] - 2024-05-23

Now, creating an AI note will use GPT-4o instead of GPT-4.

This update also fixes a bug for users not able to create a note if the default folder isn't spelled "Notes".

## [Bug Fix Update] - 2024-05-16

Fix crashes caused by empty links or tags.

## [Links, Backlinks, and Tags] - 2024-05-14

This update enhances the Apple Notes extension with several new features:

- **Note Links**: You can now see and open links directly in your Apple Notes using the new `Open Links` action.
- **Backlinks**: The `Open Backlinks` action allows you to easily navigate through related notes and discover how your notes are connected.
- **Tags**: Tags within your notes are now displayed and searchable, making it simpler to find your notes.
- **Improved Detail View**: The detail view now provides more information about each note, including the folder name, last update time, links, backlinks, tags, and more.

It also fixes a bug where links would not be opened for users not having macOS Sonoma.

## [Add text to note] - 2024-04-26

Add a new command called `Add Text to Note` allowing you to quickly append text to your notes for faster note-taking. You can also add text to a note from the `Search Notes command`.

## [Use new URI scheme] - 2024-04-25

Merge `Copy Mobile Note URL` into `Copy Note URL` by using the `applenotes://` scheme that works on all platforms.

## [Find related notes] - 2024-04-10

Add `Find Related Notes` feature to suggest relevant notes based on a selected note.

## [Refactoring] - 2024-04-08

Improve code maintainability by migrating `DispatchGroup` to structured concurrency.

## [Improve AI Note command UX] - 2024-04-04

The new note created by the `AI Note` command is now instantly displayed for immediate editing.

## [Fix invitations] - 2024-04-03

Fix a bug where notes can't be loaded at all if there is no invitations table.

## [Big Update] - 2024-03-28

The Apple Notes extension has been improved in every way to make Raycast the perfect companion for your notes. Here's what's new:

### Menu bar command

There's now a new command allowing you to quickly access your most recent notes from the menu bar. This ensures that you stay on top of your pinned notes or notes you worked on recently.

### More accessories

List items has more accessories allowing to view more details of a note such as:

- If the note is password-protected or not
- If the note has a checklist in progress or if the checklist is completed
- If the note is shared with someone else

It's also possible to search for these notes thanks to special keywords such as `locked`, `password`, `checklist`, `completed`, or `shared`.

### AI Note command

Let the AI quickly create notes for you whenever you think of something. Whether you want to get a grocery list for a barbecue, know what you can do in Paris for a week-end, or brainstorm name ideas for a new business, this new command got you covered.

### Preview notes

View your entire note from Raycast. Just press ⌘ + ⏎ from the list item and you'll see the formatted note. Super useful if you quickly want to look at something.

### Pinned notes

There's now proper support for pinned notes, just like on the Apple Notes native app.

### Other improvements

- Copy invitation links for shared notes with ⌘ + ⇧ + S.
- Copy the note title with ⌘ + ⇧ + .
- Copy the note content as plain text, HTML, or Markdown with ⌘ + ⇧ + M. This can be useful if you want to export the note to another note app.
- Improved empty screen view if you don't have any notes.

## [Better search] - 2024-03-22

- Improve note search to include more details on folders and snippets
- Make notes open faster
- Fix `Refresh` action
- Add more details on permission screen

## [Improvements & bug fixes] - 2024-03-22

- Fix `database disk image is malformed` error
- Quickly capture selected text with the `New Note` command
- Add a text argument to `New Note`
- Add a refresh action to get latest note updates

## [Rich text support] - 2023-06-08

- Added rich text support when copying an URL

## [Bug Fixes & Improvements] - 2023-04-09

- Added Copy Note URL and Copy Mobile Note URL actions.
- Added Delete Note and Restore Note actions.
- Moved Recently Deleted notes to their own section at the bottom
- Fixed Open Note action not working on notes outside of the current account

## [Open note in separate windows] - 2023-03-31

- Added the function to open notes in separate windows.

## [Fix error handling] - 2023-02-20

- Added error handling when Raycast doesn't have Accessibility/Automation permission.

## [Improve New Note to open with fallback text] - 2023-01-30

- Added fallback behaviour to create notes with the input text.
- Added a workaround to activate the window if there isn't one.
- Updated Raycast API to the latest.

## [Fix searching quotes] - 2022-12-11

- Correct issue where searching for notes with quotes in titles failed

## [Warp Speed] - 2022-07-08

- Fetching the Notes for the iCloud account will now be really fast
- A preview of the content will be shows for iCloud notes

## [Fix caching problem] - 2022-05-20

- Ignore incompatible caches

## [Fix duplicated notes] - 2022-05-11

- Skip duplicate notes caused by smart folders.

## [Fix New Note command] - 2022-04-26

- New Note command now works on non-English systems.

## [Apple Notes Improvements] - 2022-02-18

- Add support for system date format handling + some changes under the hood.

## [Add Extension] - 2022-01-17

- Add Apple Notes extension.
