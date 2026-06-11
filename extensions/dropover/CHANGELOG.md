# Dropover Changelog

## [Add Clipboard Support] - 2026-03-15

### New Features

- **New Command: "Add Clipboard to Dropover"** - Add images or text directly from clipboard
- Supports all major image formats:
  - **Animated**: GIF
  - **Modern**: WebP, HEIC, AVIF
  - **Common**: PNG, JPEG, JPEG 2000
  - **Legacy**: TIFF, BMP, ICO, PSD
- Automatically saves clipboard images with correct file extensions
- Text content is saved as `.txt` files and added to Dropover
- Clear error messages for unsupported formats (videos, etc.)

### Technical Improvements

- Uses native macOS AppleScript for reliable clipboard image extraction
- Fallback to PNG format when specific format extraction fails
- Proper video format detection to show helpful error messages
- **Auto-cleanup**: Temporary files older than 24 hours are automatically deleted

## [Fix special characters in filenames and update docs] - 2025-05-21

- Fixed the issue with files containing special characters (like apostrophes and '#') failing to be added to Dropover
- Improved file handling implementation by switching from `exec` to `spawn` for better process management
- Added better error handling and logging for failed operations
- Updated command icon for better visibility
- Enhanced README.md with additional links and information:
  - Added links to the project GitHub repository
  - Added an author GitHub profile link
  - Added Dropover app website link
- Fixed the typo in Dropover app name in README

## [Fix the issue with adding files and add screenshot] - 2023-05-08

Now you can add files with any name (including spaces and Chinese characters, for example) to Dropover from Raycast.
Also, added a screenshot to README.md

## [Added Dropover] - 2023-03-31

Initial version code
