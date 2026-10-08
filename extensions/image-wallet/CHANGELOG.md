# Image Wallet Changelog

## [Sorting, PDF Previews and Layout Options] - 2026-08-25

- Added PDF Cards previews, rendered from the first page with PDFium (WebAssembly, so macOS and Windows behave identically)
- Added sorting by name, date added, date modified, file size, Recently Used, and Most Used
- Added a Thumbnail Layout preference: inset (default), contain, or fill
- Added a Cards per Row preference, from 3 to 8 columns
- Pockets now nest: folders at any depth become their own Pocket, named by their path
- Added dedicated screens for a missing, deleted, or unreadable Wallet directory
- Added .avif support
- Read-error toasts now include a Change Wallet Directory action; the existing Suppress Read Errors preference still silences them

## [Windows Support] - 2026-08-25

- Added Windows support
- Video previews on Windows are generated with ffmpeg when it is available on the PATH
- Shortcuts now use Ctrl on Windows and ⌘ on macOS
- Paths are built with Node's path utilities instead of hardcoded POSIX separators
- Cards and Pockets are now sorted by name instead of relying on directory read order
- Fixed the Wallet falling back to an error instead of the default directory when the configured directory is unavailable

## [New Features] - 2025-08-11

- Added 'Show in Finder' action with ⌘O shortcut for individual images
- Added symbolic link support
- Enhanced error messages for better user experience
- Hid Photo Library read errors regardless of preference
- Improved handling of files with special characters in paths
- SVG files now display properly even with special characters in file paths
- Fixed file extensions appearing when not in all lowercase
- Fixed Pocket names showing a colon instead of a forward slash

## [Bug Fixes] - 2024-06-12

- Added 'Suppress Read Errors' option
- Fixed error when attempting to read a file or directory without permission
- Fixed placeholder text in the search bar when having a single card

## [Added a new keyword for improved searchability] - 2024-05-21

## [Video Previews] - 2023-07-11

- Added 'Generate Video Previews' option
- Added 'Remember Pocket Filter' option
- Added Unsorted filter
- Added file type previews to non-image Cards
- Fixed obsessive re-scanning when changing filter
- Fixed Pockets not updating when refreshing

## [1.0] - 2023-04-25

- Initial release of Image Wallet!
