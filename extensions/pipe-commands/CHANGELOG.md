# Pipe Commands Changelog

## [Added new commands] - 2024-03-15

- Copy plain text to rich text clipboard
- Remove blank lines in a string
- Add url decode

## [Added new dedicated clipboard command] - 2024-03-07

BREAKING CHANGE: the text command no longer falls back to the clipboard contents. Now, there is a dedicated clipboard
command to pipe clipboard input.

## [Added new pipe command] - 2024-03-05

- Added "Add bulletpoint to newline" command

## [Added new pipe command] - 2023-11-28

- Add remove smart quotes command (helpful for some LLM prompting)
- Fixed code on the tab-to-newline

## [Pipe to text enhancement] - 2023-10-24

- Fallback to clipboard when text selection fails (new error type)

## [Added new pipe commands] - 2023-10-22

- Improved placeholder UX to make it clear what different commands pull from

## [Added new pipe commands] - 2023-10-17

- Added new command to convert tab to newline

## [Added new pipe commands] - 2023-09-07

- Adding extract url from text (extract-urls-from-text)

## [Added new pipe commands] - 2023-08-08

- Adding comma conversion utils (comma-to-newline, newline-to-comma)

## [Added new pipe command] - 2023-05-31

- Add a pipe text command script to remove duplicate newlines.

## [File/Tab input] - 2022-10-04

### Added

- Add support for file and tab input
- New directive `@raycast.inputType` and `@raycast.outputType` to specify the input and output for `pipe` mode
- `silent` mode now supports setting the `@raycast.argument1` type to `file` or `tab`

## [Added new pipe commands] - 2022-09-26

- Added new pipe command: convert newline to spaces

## [Added new pipe commands] - 2022-09-19

Adding two new pipe command scripts:

- Reverse lines
- Convert newlines to spaces

## [Improve Documentation] - 2022-08-15

### Fixed

- Fix outdated documentation
- update `unique line` and `count-character` commands

## [Improve Compatibility with Script Commands, Restore file argument] - 2022-08-15

### Added

- Allow the user to create a custom pipe command folder
- Add support for `@raycast.iconDark` metadata
- Add support for `compact` mode
- Add support for `needsConfirmation` mode
- `@raycast.icon` and `@raycast.iconDark` now support emojis, relative filepaths and remote urls

### Fixed

- Fix `Read Text` script

### Breaking

- Raycast IconSet values are no longer supported as icons (icons will be blank)
- deprecate `paste` and `copy` modes in favor of `pipe` mode
- Remove `Manage Pipe Commands` command

## [Add `Read the Content` Command] - 2022-04-07

## [Fixes] - 2022-03-08

- Remove buggy file arguments
- Fix text input from the clipboard
- Use List Details to preview commands content from the management view
- Add JSON schema for Pipe Commands and show parsing errors in UI
- Add a link to the README in the command templates
- Add better error reporting when running scripts

## [Improvements] - 2022-03-08

- Instead of presenting each output types for each pipe commands, this PR allows the developer to set the desired output using the @raycast.mode directive.
- Simplifies the update of built-in pipe commands distributed with the assets folder.
- A bug in the Create Pipe Command command was also corrected (outdated @raycast.input directive)

## [Added Pipe Commands] - 2022-02-28
