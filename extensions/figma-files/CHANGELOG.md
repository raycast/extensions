# Figma Files Changelog

## [Adds support for Figma's updated API] - 2025-02-07

- Updated oauth endpoints via new Raycast Proxies.

## [Fixed "could not load pages" issue] - 2024-12-14

- Fixed a bug where pages for all figma files were being fetched unnecessarily,
  that caused errors when scrolling through through the grid.

## [Adds last edited timestamp] - 2024-12-12

- You can now see when was the Figma file last edited ("last edited 2 days
  ago"), to better understand how stale the file is.

## [Adds support for OAuth] - 2024-04-15

- The extension now has OAuth support, so you don't have to create personal
  access tokens for giving Raycast access to Figma.

## [Adds support for Quicklinks] - 2024-01-26

- Include context in your Quicklink to search Figma on launch. For example,
  `raycast://extensions/michaelschultz/figma-files-raycast-extension/index/?context=%7B%22query%22%3A%22{Query}%22%7D`
  will search your query on launch.

## [End of the year clean up] - 2023-12-20

- Updates dependencies
- Fixes several small issues found using Raycast Issues

## [Improved search and filter options] - 2023-10-02

- You can now search for projects.
- The dropdown filter now lists all projects inside a team even when multiple
  teams are configured.

## [Support for starring files, Grid UX improvements] - 2023-08-31

- Added support for starring frequently accessed figma files. Max starred files
  limit is 10.
- Added accessory icon in grid to identify files with branches.
- Added tooltip on hover to view entire file names.

## [Support for opening file branches and improvements] - 2023-06-07

- Added support for opening a specific branch of a file through the CMD+K menu.
- Added icons to differentiate between Projects and Teams.
- When a single team is added, the search dropdown shows projects instead of
  teams.
- Handled edge cases like when a project or team is empty.

## [Multi-team support and better caching] - 2023-05-12

- Added support for multiple teams. You can now search across multiple teams by
  providing a comma separated list of teamIDs in preferences.
- Search results are cached for smoother experience. You can now also search for
  files when offline.

## [Fixes] - 2022-12-20

- Fixed a bug that caused the extension to crash if a project didn't have any
  files

## [Fixes] - 2022-09-23

- Fixed a bug where it always tried to open files in the desktop app, even
  though Figma was not installed.
- Fixed a endless loop causing the CPU to spike while having extension open.
- Fixed a crash if data could not be fetched for some reason.

## [Grid thumbnails and menubar app] - 2022-09-12

- Replaces List with Grid to see larger thumbnails.
- New menubar app to access your files even quicker!
- Removed deprecated Raycast functions and updated dependencies.

## [Error view] - 2022-02-08

Added a new error view.

## [Open Page Action] - 2021-11-19

Added action in the action panel `⌘K` to search and directly open a page in
Figma.

## [Recently Visited & README] - 2021-11-09

Added recently visited section and a README.

## [Initial Version] - 2021-10-18

Add Figma Files extension
