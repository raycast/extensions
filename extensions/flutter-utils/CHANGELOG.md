# Flutter Utils Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.5.5] - {PR_MERGE_DATE}

### Changed
- Store gallery image optimization: normalized formats, dimensions and weights in `metadata/screenshots/` for sharp and compliant rendering.
- Bump version to 0.5.5.

## [0.5.4] - {PR_MERGE_DATE}

### Changed
- Raycast manifest icon now `assets/icon.png`.
- Bump version to 0.5.4.

### Fixed
- Store compliance: aligned `assets/` structure and metadata.

## [0.5.3] - {PR_MERGE_DATE}

### Added
- Added `metadata/` folder with `screenshots/` and Store descriptions.

### Changed
- Improved Raycast Store submission compliance.
- Bump version to 0.5.3.

## [0.5.2] - {PR_MERGE_DATE}

### Changed
- Normalize `package.json` formatting (ensure trailing newline) to fix CI jq parse.
- Bump version to 0.5.2.

## [0.5.1] - {PR_MERGE_DATE}

### Changed
- Ignore `.idea/` folder in Git to allow clean publish.
- Bump version to 0.5.1.
- Maintenance: prepare Raycast Store publish.

## [0.5.0] - {PR_MERGE_DATE}

### Changed
- Translated all comments, UI messages, and markdown files to English to meet Raycast Store guidelines.
- Updated README and CHANGELOG to English.

## [0.4.12] - {PR_MERGE_DATE}

### Changed
- Improved internal documentation (docstrings) for functions, methods, and attributes.
- Publication preparation: completed README and verified metadata.

## [0.4.11] - {PR_MERGE_DATE}

### Changed
- Hardened Warp execution: successive sends of Return, key code 36, Enter (numpad 76) and Ctrl+M to force launch even in bracketed paste mode.

## [0.4.10] - {PR_MERGE_DATE}

### Changed
- More robust paste + validations: focus window, keystroke return + key code 36 with extended delays.

## [0.4.9] - {PR_MERGE_DATE}

### Changed
- Automatic execution in Warp: command with newline, double Enter sent to ensure launch.

## [0.4.8] - {PR_MERGE_DATE}

### Changed
- More reliable Warp opening: command copied to clipboard then pasted (Cmd+V), adjusted delays.

## [0.4.7] - {PR_MERGE_DATE}

### Changed
- Simplified Warp script (activate + Cmd+N + run) to match manually tested behavior.

## [0.4.6] - {PR_MERGE_DATE}

### Changed
- Hardened Warp opening: always new window, increased delays, explicit window wait.

## [0.4.5] - {PR_MERGE_DATE}

### Changed
- `Run` now always opens in Warp (mandatory interactive mode), removed the toggle option.

## [0.4.4] - {PR_MERGE_DATE}

### Changed
- Improved Warp opening (new tab/delays) and automatic fallback to Terminal.app if Warp fails.
- Confirmation message indicating the terminal used.

## [0.4.3] - {PR_MERGE_DATE}

### Added
- Added an option "Open in Warp (interactive mode: h/c/q)" for `flutter run` to use interactive commands in a real terminal.

## [0.4.2] - {PR_MERGE_DATE}

### Changed
- Filtered interactive help lines from `flutter run` in UI logs (e.g., "Flutter run key commands.", "h List all available interactive commands.", "c Clear the screen", "q Quit (terminate the application on the device).").

## [0.4.1] - {PR_MERGE_DATE}

### Changed
- Modernized logs with diff-like highlighting (success/warnings/errors/steps).
- Fixed duplicate logs via listeners cleanup and process kill on close.
- More robust devices retrieval (parsing non-JSON outputs).

## [0.4.0] - {PR_MERGE_DATE}

### Added
- Added new actions in the unified command: `analyze`, `test`, `build apk`, `build appbundle`, `build ios`, `doctor`.
- Arguments form now available for all actions (run/analyze/test/build/doctor).
- Updated description and version bump 0.4.0.

## [0.3.3] - {PR_MERGE_DATE}

### Changed
- Progress: no longer shows "Error" on start; final state is determined by exit code.

## [0.3.2] - {PR_MERGE_DATE}

### Changed
- Only the unified "Flutter" command appears in Raycast (Run/Clean/Pub Get from the UI).

## [0.3.1] - {PR_MERGE_DATE}

### Changed
- Removed "Terminal" and "Verbose Logs" preferences (Warp enforced, integrated UI logs).

## [0.3.0] - {PR_MERGE_DATE}

### Added
- Added a progress UI (Detail) with live logs for Run / Pub Get / Clean.

### Fixed
- Fixed PATH in the progress view (added SDK bin if defined).

## [0.2.5] - {PR_MERGE_DATE}

### Changed
- Injected Flutter SDK into PATH for background commands (fix "flutter not found").

## [0.2.4] - {PR_MERGE_DATE}

### Added
- Added "Verbose Logs" preference and an internal logger (Raycast developer console).

### Changed
- Logs on: project resolution, chosen terminal, executed commands, detected SDK.

## [0.2.3] - {PR_MERGE_DATE}

### Changed
- `flutter pub get` and `flutter clean` always use `flutter ...` (SDK Path is not used for these commands).

## [0.2.2] - {PR_MERGE_DATE}

### Added
- Added "Flutter SDK Path" preference and use the corresponding binary if defined.

## [0.2.1] - {PR_MERGE_DATE}

### Added
- Added "Terminal" preference (Warp by default).
- Support for running interactive commands in Warp.

## [0.2.0] - {PR_MERGE_DATE}

### Added
- Added unified "Flutter" command listing actions and supporting arguments.

## [0.1.0] - {PR_MERGE_DATE}

### Added
- Added commands: Flutter Run, Flutter Pub Get, Flutter Clean.
- Added `Project Path` preference.
- Updated documentation.