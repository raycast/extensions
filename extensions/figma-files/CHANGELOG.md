# Figma Files Changelog

## [Support for opening file branches and improvements] - 2023-06-07

- Added support for opening a specific branch of a file through the CMD+K menu.
- Added icons to differentiate between Projects and Teams.
- When a single team is added, the search dropdown shows projects instead of teams.
- Handled edge cases like when a project or team is empty.

## [Multi-team support and better caching] - 2023-05-12

- Added support for multiple teams. You can now search across multiple teams by providing a comma separated list of teamIDs in preferences.
- Search results are cached for smoother experience. You can now also search for files when offline.

## [Fixes] - 2022-12-20

- Fixed a bug that caused the extension to crash if a project didn't have any files

## [Fixes] - 2022-09-23

- Fixed a bug where it always tried to open files in the desktop app, even though Figma was not installed.
- Fixed a endless loop causing the CPU to spike while having extension open.
- Fixed a crash if data could not be fetched for some reason.

## [Grid thumbnails and menubar app] - 2022-09-12

- Replaces List with Grid to see larger thumbnails.
- New menubar app to access your files even quicker!
- Removed deprecated Raycast functions and updated dependencies.

## [Error view] - 2022-02-08

Added a new error view.

## [Open Page Action] - 2021-11-19

Added action in the action panel `⌘K` to search and directly open a page in Figma.

## [Recently Visited & README] - 2021-11-09

Added recently visited section and a README.

## [Initial Version] - 2021-10-18

Add Figma Files extension
