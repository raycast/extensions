# FileMaker Snippets Changelog

## [Fixes] - 2025-03-03

- Update to Raycast API 1.93.0
- Fix a bug where the snippet text was not being saved when editing the XML of a snippet
- Update FileMaker icons to the latest version

## [Fixes] - 2024-04-05

- Fix encoding for launching favorite or recent files that contain special characters

## [Fixes] - 2024-03-28

- Fix deeplinks for hosted snippets. Fetch dependency was not being loaded correctly.

## [Fixes] - 2024-03-20

- Fix snippet creation from clipboard

## [Fixes] - 2024-03-04

- Improved frecency sorting for recent/favorite files

## [Update AppleScripts] - 2024-02-12

- Now running version 4.0.4 of FmClipTools under the hood

## [Fixes] - 2024-02-05

- Improved searching for recent/favorite files with additional keywords
- Added Frecency sorting to recent/favorite files, so the most used files are shown first

## [Recents and Favorites] - 2024-01-29

- Added new commands to search recent/favorite FileMaker files

## [Deeplink Support] - 2024-01-26

- Renamed extension to `FileMaker Snippets`
- Added support for deeplinking to a specific snippet. Use deeplinks to share snippets with others using just a URL.

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
