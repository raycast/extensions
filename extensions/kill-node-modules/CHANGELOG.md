# Kill Node Modules Changelog

## [Overhauled Extension for Performance and Configurability] - 2025-05-12

This major update addresses key performance issues, introduces essential configuration options, and significantly refactors the codebase for better readability and modularity.

### Added

- **Configuration Options**: Users can now specify a **Root Folder** (`scanRoot`) and **Scan Depth** (`scanDepth`) in extension preferences. This prevents scanning the entire file system and allows for targeted searches, similar to the Git Repos extension.
- **Improved README**: Updated `README.md` with detailed instructions on the new configuration preferences (`rootFolder` and `scanDepth`) and how to set them up.
- **Error Handling**: Introduced a custom `tryCatch` utility for more robust and standardized error handling throughout the extension.

### Changed

- **Search Performance**: Replaced the slower `du` command-line utility with the `fast-glob` library for significantly faster scanning of `node_modules` directories and calculation of their sizes.
- **Initial Load Time**: Improved initial loading speed and UI responsiveness by leveraging Raycast's `useCachedPromise` hook for efficient data fetching and caching.
- **Code Modularity**: Substantially refactored the codebase for improved structure, readability, and maintainability.
- **Error Messaging**: Enhanced error messages to be more user-friendly and provide clearer information when issues occur.

### Fixed

- Addressed critical performance bottleneck causing slow searches.
- Resolved issue where the extension would attempt to scan the entire file system by default, leading to long wait times.

### Removed

- Eliminated manual caching logic (e.g., `getCachedModules`, `saveModulesToCache` methods and associated `LocalStorage` usage) as this functionality is now more effectively handled by the `useCachedPromise` hook.

## [Updated an action title] - 2024-09-12

## [Initial Version] - 2024-09-10
