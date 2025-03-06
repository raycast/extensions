# OTP/2FA Manager Changelog

## [Fixed Deployment Issues] - 2025-03-06

- Added TypeScript declaration file for thirty-two module to resolve type errors
- Replaced @raycast/utils toast functions with native @raycast/api toast functions for better compatibility

## [Improved Security and Internationalization] - 2025-03-06

- Translated all Spanish UI text and comments to English (US) for better compatibility
- Changed default period value from 10 seconds to 30 seconds to align with standard OTP implementations
- Implemented secure Base32 decoding using the thirty-two library instead of manual implementation
- Added metadata folder with README for store listing requirements
- Updated example OTP configurations to use placeholder secrets and example.com email addresses
- Changed file reading to use async fs.promises.readFile instead of synchronous readFileSync
- Added 'dom' library to tsconfig.json for proper React support
- Updated ESLint configuration to treat unused variables as errors instead of warnings

## [Fixed TypeScript Errors and Publishing Requirements] - 2025-03-05

- Added React imports to all TSX files to resolve UMD global errors
- Fixed keyboard shortcuts in the main view for better usability
- Corrected title formatting in package.json to meet Raycast requirements
- Removed unused imports to improve code quality
- Added proper modifiers to keyboard shortcuts
- Updated action titles to use proper Title Case

## [Enhanced OTP Management Features] - 2025-03-05

- Added keyboard shortcuts for OTP code handling:
  - Enter (⏎): Inserts the OTP code into the application
  - Cmd+Enter (⌘⏎): Copies the OTP code to the clipboard
- Improved import functionality to redirect to main view after successful import
- Added configurable period options for OTPs
- Enhanced user feedback with toast notifications for successful operations

## [Improved URL Parsing and Error Handling] - 2025-03-04

- Added proper URL and URLSearchParams imports from Node.js
- Enhanced error handling for invalid OTP configurations
- Improved validation of imported JSON files
- Fixed issues with remaining time display in the UI

## [Initial OTP Manager Implementation] - 2025-03-01

- Created basic OTP/2FA code management functionality
- Implemented main view for displaying OTP codes with remaining time
- Added form for manually adding new OTP configurations
- Created import functionality for OTP configurations from JSON files
- Implemented secure storage for OTP secrets
- Added support for different OTP algorithms (SHA1, SHA256, SHA512)
- Implemented period options for OTP generation (30 and 60 seconds)
