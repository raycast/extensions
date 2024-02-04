# File Manager Changelog

## [Features] - 2023-12-18

- Added `Set Wallpaper` action for images.

## [Fixes] - 2023-12-01

- Resolved an issue with deleting non-empty folders.

## [Fixes] - 2023-10-09

- When a ~ was in the middle of the Start Directory preference value, it would incorrectly expand it.
- Preferences were fetched for every single item, now it's only fetched once per directory

## [Update] - 2023-09-12

- Removed dedicated code for symlink file and directories, and instead pass it on to DirectoryItem or SymlinkItem
- Added sections to actions
- Added toggle quick look action to everything
- Fixed showFileSize showing just an icon when the preference is disabled

## [Update] - 2023-09-08

- Added support for quicklinks to open file manager to a specific folder
- Replace using shell scripts with using the node:fs alternatives
- Added cmd-f shortcut to open in finder

## [Features] - 2023-08-06

- Added Actions OpenWith for directories.

## [Fixes] - 2023-05-22

- Fix standard shortcuts for deletion.

## [Features] - 2023-05-18

- Added support for using standard shortcuts.

## [Features] - 2023-05-14

- Added support for renaming files and folders.

## [Fixes] - 2023-04-11

- Modified behavior to prevent errors caused by broken symlinks.
- Added an icon to indicate broken symlinks.

## [Features] - 2023-03-31

- Added support for moving files to trash.
- Added support for permanently deleting files.

## [Initial Version] - 2021-11-17

Add File Manager Extension.
