# Kiro Changelog

## [1.1.1] - 2025-08-05

### Improvements & Fixes
- Fixed grid navigation logic in pinned.tsx for correct 'down' movement
- Improved error handling: replaced manual showToast with showFailureToast in multiple files
- Fixed AppleScript path parsing in open-with-kiro.ts to handle spaces correctly
- Corrected typo: extensionsManifestFilename in lib/kiro.ts
- Combined Raycast API imports in preferences.ts for clarity
- Improved refresh logic in extensions.tsx for reliable data re-fetch

## [1.1.0] - 2025-07-XX

### Bug Fixes
- Fixed SQL injection vulnerability in database operations
- Fixed infinite loop condition in waitForFileExists function
- Fixed state mutation bugs in pinned entries management
- Fixed AppleScript return format parsing in open-with-kiro
- Fixed existsSync calls to use proper string paths instead of URL objects
- Fixed incorrect toast messages during extension operations
- Fixed React component rendering issues in grid-or-list components

### Code Quality Improvements
- Updated ESLint configuration to use standard Raycast config
- Replaced manual error handling with showFailureToast utility
- Updated AppleScript imports to use @raycast/utils
- Added missing subtitle to package.json commands
- Improved error handling consistency across the extension

## [1.0.0] - {PR_MERGE_DATE}

### Features Added
- **Search Recent Projects**: Browse and open recent projects from Kiro
- **Open with Kiro**: Open selected Finder items with Kiro
- **Open New Window**: Open a new Kiro window
- **Manage Extensions**: View, install, and uninstall Kiro extensions
- **Command Palette**: Execute Kiro commands directly from Raycast
