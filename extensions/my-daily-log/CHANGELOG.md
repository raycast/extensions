# my-daily-log Changelog

## [Fixes] - {PR_MERGE_DATE}

- Handle macOS permission errors (EPERM/EACCES) when the Daily Log Path is in a protected location (e.g. `~/Downloads`, `~/Desktop`, `~/Library/CloudStorage/…`). The extension now shows a failure toast with guidance to grant Full Disk Access or change the preference, instead of crashing.

## [Fixes] - 2023-09-08

- Fixed a bug where if the folder for logs did not exist, the extension would crash

## [Update] - 2023-03-31

- Added new Daily Summary report command using RaycastAI
- Added new Daily Standup Speech command using RaycastAI
- Added new Summery of a Month report command using RaycastAI

- Fixed a bug where the date was being formatted incorrectly for display in the list of logs

## [Update] - 2022-12-23

- Added support for Editing Daily Logs

## [Initial Version] - 2022-11-14
