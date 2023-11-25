# Claris Snippets Changelog

## [Fixes] - 2023-07-27

- Fixed a bug where Claris database couldn't be located

## [Fixes] - 2023-03-14

- Improve performance when loading snippets from a large folder
- Show warning on the form to not pick a large folder in the first place
- Add a loading UI when adding a folder
- Fixes [Claris Snippets] ... #5331
- Limit displayed snippet text to 500 characters to improve performance when editing metadata for a large snippet
- Fixed a bug that prevented users from saving snippets to the default directory

## [Dynamic Snippets] - 2023-03-10

- Added: Dynamic snippets let you replace any values in a snippet's XML with values from a dynamic form each time you go to copy the snippet.

## [Support Editing Raw XML] - 2023-03-09

- Added: Edit the raw XML of a snippet inline in Raycast. Since this is advanced, this feature is available in a seperate form
- Added: Abilty to copy a snippet's internal UUID to the clipboard
- Support for Raycast 1.48.8

## [Support Git Locations] - 2022-10-10

- Added: support snippets located in a git repository
- Added: support for snippets stored in sub-folders for a given location

## [Initial Version] - 2022-09-27

- Create new snippets from clipboard
- Auto-detect type of snippet
- Support for multiple folder locations where snippets are saved
- Edit/Duplicate/Delete existing snippets
