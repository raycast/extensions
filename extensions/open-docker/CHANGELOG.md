# Open Docker Changelog

## [Enhanced Error Handling & AppleScript Execution] - 2025-06-13

- **Improved AppleScript Execution**: Replaced `exec` with `runAppleScript` from `@raycast/utils` for more reliable and native AppleScript execution
- **Enhanced Error Handling**: Implemented `showFailureToast` from `@raycast/utils` for consistent and better error messaging
- **Code Simplification**: Removed dependency on Node.js `child_process` module in favor of Raycast's built-in utilities
- **Better User Experience**: More consistent error toast styling and messaging across all error scenarios

## [Features] - 2025-06-13

- Installation Check: Added a check to ensure Docker Desktop is installed before running, providing a clear error message if it's not found.
- Desktop Switching Fix: Implemented a two-step AppleScript (reopen then activate) to reliably focus the Docker Dashboard window, even when it's on a different macOS Desktop/Space.
- Enhanced Feedback: Replaced temporary HUDs with clearer showToast notifications for success, failure, and error states.
- Seamless Experience: Added closeMainWindow() to hide the Raycast window instantly upon execution.
- Robust Error Handling: Wrapped the logic in a try-catch block to manage unexpected errors gracefully.
- Initial Setup: Created the complete extension structure, metadata (package.json), and icon for submission to the Raycast Store.