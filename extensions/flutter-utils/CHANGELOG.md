# Flutter Utils Changelog

## [0.5.1] - 2025-09-25

- Ignore `.idea/` folder in Git to allow clean publish
- Bump version to 0.5.1
- Maintenance: prepare Raycast Store publish

## [0.5.2] - 2025-09-25

- Normalize `package.json` formatting (ensure trailing newline) to fix CI jq parse
- Bump version to 0.5.2

## [0.1.0] - 2025-09-23

- Added commands: Flutter Run, Flutter Pub Get, Flutter Clean
- Added `Project Path` preference
- Updated documentation

## [0.2.0] - 2025-09-23

- Added unified "Flutter" command listing actions and supporting arguments
- Version bump 0.2.0

## [0.2.1] - 2025-09-23

- Added "Terminal" preference (Warp by default)
- Support for running interactive commands in Warp

## [0.2.2] - 2025-09-23

- Added "Flutter SDK Path" preference and use the corresponding binary if defined

## [0.2.3] - 2025-09-23

- `flutter pub get` and `flutter clean` always use `flutter ...` (SDK Path is not used for these commands)

## [0.2.4] - 2025-09-23

- Added "Verbose Logs" preference and an internal logger (Raycast developer console)
- Logs on: project resolution, chosen terminal, executed commands, detected SDK

## [0.2.5] - 2025-09-23

- Injected Flutter SDK into PATH for background commands (fix "flutter not found")

## [0.3.0] - 2025-09-23

- Added a progress UI (Detail) with live logs for Run / Pub Get / Clean
- Fixed PATH in the progress view (added SDK bin if defined)

## [0.3.1] - 2025-09-23

- Removed "Terminal" and "Verbose Logs" preferences (Warp enforced, integrated UI logs)

## [0.3.2] - 2025-09-23

- Only the unified "Flutter" command appears in Raycast (Run/Clean/Pub Get from the UI)

## [0.3.3] - 2025-09-23

- Progress: no longer shows "Error" on start; final state is determined by exit code

## [0.4.0] - 2025-09-24

- Added new actions in the unified command: `analyze`, `test`, `build apk`, `build appbundle`, `build ios`, `doctor`
- Arguments form now available for all actions (run/analyze/test/build/doctor)
- Updated description and version bump 0.4.0

## [0.4.1] - 2025-09-24

- Modernized logs with diff-like highlighting (success/warnings/errors/steps)
- Fixed duplicate logs via listeners cleanup and process kill on close
- More robust devices retrieval (parsing non-JSON outputs)

## [0.4.2] - 2025-09-24

- Filtered interactive help lines from `flutter run` in UI logs (e.g., "Flutter run key commands.", "h List all available interactive commands.", "c Clear the screen", "q Quit (terminate the application on the device).")

## [0.4.3] - 2025-09-24

- Added an option "Open in Warp (interactive mode: h/c/q)" for `flutter run` to use interactive commands in a real terminal

## [0.4.4] - 2025-09-24

- Improved Warp opening (new tab/delays) and automatic fallback to Terminal.app if Warp fails
- Confirmation message indicating the terminal used

## [0.4.5] - 2025-09-24

- `Run` now always opens in Warp (mandatory interactive mode), removed the toggle option

## [0.4.6] - 2025-09-24

- Hardened Warp opening: always new window, increased delays, explicit window wait

## [0.4.7] - 2025-09-24

- Simplified Warp script (activate + Cmd+N + run) to match manually tested behavior

## [0.4.8] - 2025-09-24

- More reliable Warp opening: command copied to clipboard then pasted (Cmd+V), adjusted delays

## [0.4.9] - 2025-09-24

- Automatic execution in Warp: command with newline, double Enter sent to ensure launch

## [0.4.10] - 2025-09-24

- More robust paste + validations: focus window, keystroke return + key code 36 with extended delays

## [0.4.11] - 2025-09-24

- Hardened Warp execution: successive sends of Return, key code 36, Enter (numpad 76) and Ctrl+M to force launch even in bracketed paste mode

## [0.4.12] - 2025-09-24

- Improved internal documentation (docstrings) for functions, methods, and attributes
- Publication preparation: completed README and verified metadata

## [0.5.0] - 2025-09-25

- Translated all comments, UI messages, and markdown files to English to meet Raycast Store guidelines
- Updated README and CHANGELOG to English