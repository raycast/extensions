## Flutter Utils – Description Store

Flutter Utils provides quick access to common Flutter commands directly from Raycast. Launch `flutter run`, execute `pub get`, clean with `clean`, analyze and test your project, build for multiple targets (`apk`, `appbundle`, `ios`) and check diagnostic `doctor` — all through a unified interface.

### Key Features

- Single action selector with arguments form
- Device selection for `flutter run`
- Progress tracking and live logs with status highlighting
- Interactive execution in terminal (Warp priority, fallback to Terminal.app)
- Flexible project path and Flutter SDK resolution via preferences

### Use Cases

- Quickly start a `flutter run` session on a specific device
- Install dependencies (`pub get`) or clean artifacts (`clean`)
- Analyze, test and build without leaving Raycast
- Diagnose environment with `doctor`

### Configuration

- Preferences: `Project Path` (optional), `Flutter SDK Path` (optional)
- Icon: `assets/extension-icon.png`

### Notes

The extension handles errors, cleans up processes, and optimizes macOS workflows. Simple commands can run in background; `flutter run` prioritizes interactive terminal session.
