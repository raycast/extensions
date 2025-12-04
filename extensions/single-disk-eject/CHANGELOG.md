# Single Disk Eject Changelog

## [Bug Fix] 2023-11-10

- Fixed bug that incorrectly reported a disk as ejected when it was not.
  - Previously if you attempted to eject a disk that was in use, the extension falsely replied that it was ejected, but the volume was still mounted. This bug has been fixed now and the extension will correctly report that there was an error when ejecting a disk.

## [Bug Fix] 2022-08-03

- Fixed bug introduced in previous version where it required preferences to be set
  - No longer required to include a list of ignored volumes

## [Improvements and Bug Fix] 2022-07-29

- Added ability to store list of ignored volumes in Raycast Preferences
- Fixed bug wherein long-running ejection could show completion falsely

## [Added Single Disk Eject] 2021-11-18

Initial version of the extension
