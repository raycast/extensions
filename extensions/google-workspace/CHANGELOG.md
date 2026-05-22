# Google Workspace Changelog

## [Bug Fix] - 2026-05-22

- Prevent Google Drive search from crashing when the Drive API response does not include a files list.

## [Add Preferred Browser Preference] - 2026-01-08

- Allow users to specify which browser they want to use.

## [Hierarchical Navigation] - 2026-01-05

### Changed

- 📂 **Hierarchical Drive navigation** — The extension now loads only files from the root directory by default (navigate through folders to see their contents).
- 🔍 **Global search** — Searching for a term now automatically searches across the entire Drive, while browsing without a search term stays within the current directory.

## [Folder Navigation Enhancements] - 2025-12-25

### Added

- 📂 **Improved folder navigation** — Navigate folder hierarchies with the new "Enter Directory" and "Go to Parent Directory" actions (accessible via `Tab` and `Shift + Tab` keyboard shortcuts).
- 🔍 **Enhanced empty state** — The empty view now displays the Google Drive icon for better visual feedback.

## [Improvements and Fixes] - 2025-12-18

### Changed

- 📂 **File location now shows folder path** - the "Where" metadata field now displays only the parent folder path, making it easier to understand file organization.
- 📑 **Expanded file type recognition** - improved support for more file types.

## [Thumbnail Previews] - 2025-12-17

### Changed

- 🖼️ **File previews now show real content** instead of generic icons - see thumbnails of documents, images, videos, and PDFs directly in the list.

## [Enhanced File Details and Improved Search] - 2025-12-15

### Added

- 📊 **Detailed file information** now displayed for every file:
  - File details: Name, Type, Size, Created, Modified, Last Opened, Shared with Me dates
  - Photo details: Dimensions, Camera model, Date taken, GPS location (tap to view in Maps)
  - Video details: Dimensions and Duration
  - Permissions: Owner, Last Modified By, Sharing status with Copy Protection indicator
- 🎨 **File icon preview** shown alongside file details.
- 📅 **Smarter date display** showing "Today" and "Yesterday" for recent files.
- ⬇️ **Download files directly** with live progress updates showing percentage and size.
- ⭐ **New starred file filters**: quickly filter by "Starred in My Drive" or "Starred in All Drives".
- 🏷️ **Clear section titles** that adapt based on your filter: "Recently Used" for file name and starred filters, "Results" for content searches.

### Changed

- 🔄 **Clearer filter dropdown** with more descriptive labels.
- 📝 **Actions reordered** for easier access to commonly used options.
- 📂 **Folder reveal action renamed** from "Open File Location in Browser" to "Reveal in Google Drive" for clarity.
- 🔍 **Search placeholder updated** to "Search in Drive" to match Google Drive's interface.

### Removed

- 🗑️ **Separate "Starred Google Drive Files" command** - you can now use starred filters in the main search instead.

### Fixed

- 🐛 **File downloads now work reliably** for all file types and sizes.

## [Add list home and open home quicklink] - 2025-03-07

- 🔗 Quickly open the Google drive home page in browser.
- 🔧 Minor fix action conflicts.

## [✨ AI Enhancements] - 2025-02-21

## [Add file path info to the file list] - 2024-10-21

- Adds the file path information to the list of accessories.

## [Log out the user if re-authentication fails] - 2024-07-11

- Automatically log out users if re-authentication fails, instead of displaying an error message.

## [Fix download link] - 2024-06-17

- Fixes the Google Drive's download links to use the currently authenticated user.

## [Adds support to choose which browser to open a file with from Action Panel] - 2024-04-11

- Adds the ability to select which browser to open a file in from the Action Panel.

## [Add Copy Markdown Link and Copy HTML Link actions] - 2024-02-19

- Add the ability to copy a link to a file list item to the clipboard as Markdown or HTML. This is useful for quickly sharing links in various applications.

## [Use OAuth utils] - 2024-02-12

- Use new OAuth utils.

## [Add menu bar shortcuts] - 2023-11-16

- Create new Google documents from the menu bar.
- Add an alternate to the menu bar command to open starred files in Raycast instead of Google Drive.

## [Fix opening link from Search Google Drive Files command]

Previously, there was a problem where links would open under the incorrect Google account. This issue has been resolved ensuring that links now open with the correct Google account.

## [Fix Google Spreadsheets creation command] - 2023-03-12

Fix the `Create Google Spreadsheet` command to use the authenticated user.

## [Open file location in browser] - 2022-12-19

Added an action allowing to open the file's location in Google Drive. This action is similar to the `Show file location` item when selecting a file in Google Drive.

## [Search on all Drives] - 2022-09-01

Added support to search not only on My Drive but also on Shared Drives.

## [Open source the Extension] - 2022-08-04

Google Workspace added to the public repository.

## [Select browser to open Google related links] - 2022-02-23

Adds the ability to override which browser Google services will open to. Head over to the extension preferences to change the browser.

## [Updated icons for commands] - 2022-01-04

Added new icons for all commands.

## [Added Extension to Store] - 2021-11-30

Google Workspace added to the Raycast Store.
