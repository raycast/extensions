# Archiver Changelog

## [Improvements and Fixes] - 2026-09-20

- Added settings to control Finder reveals after compression and extraction.
- Fixed folder name rendering when selecting a directory in the Compress command.
- Set initial focus to the format dropdown in the Compress Files command.
- Automatically detect password-protected archives and reveal the password field upfront regardless of archive size.
- Automatically focus the password field when revealed during extraction.
- Improved loading state responsiveness and non-blocking password validation when extracting password-protected archives.
- Avoided extraction failures when the intended output-folder name conflicts with an existing file.
- Assigned unique file and folder names with iterative counters during compression and extraction to prevent overwriting existing files.

## [Added Quick Compress Command] - 2025-12-17

- Added a new "Quick Compress Files" command that instantly compresses selected files without displaying an options dialog. User can also combine a shortcut for quick compression.

## [Added Preview ZIP Command] - 2025-05-05

- Added a new command to preview the contents of a ZIP file before extracting it. This command allows users to view the files and directories within the ZIP archive without extracting them.
- Fixed ESLint errors.
- Replaced Deprecated Brown Color with Orange Color.

## [Optimize Experience] - 2022-11-28

## [Initial Version] - 2022-11-23
