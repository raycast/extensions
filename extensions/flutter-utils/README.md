# Flutter Utils

Raycast extension to quickly run common Flutter commands.

## Available Commands

- Flutter: unified command listing actions and allowing additional arguments.
- Flutter Run: opens a terminal and runs `flutter run` (device selection available).
- Flutter Pub Get: runs `flutter pub get`.
- Flutter Clean: runs `flutter clean`.
- Flutter Analyze: runs `flutter analyze` (possible args: `--fatal-infos`, `--fatal-warnings`).
- Flutter Test: runs `flutter test` (possible args: `--coverage`, `-r expanded`).
- Flutter Build APK: `flutter build apk` (possible args: `--release`, `--flavor prod`).
- Flutter Build AppBundle: `flutter build appbundle`.
- Flutter Build iOS: `flutter build ios`.
- Flutter Doctor: `flutter doctor`.

## Preferences

- Project Path (optional): absolute path to your Flutter project. If empty, you can select a project folder in Finder and run the command.
- Flutter SDK Path (optional): absolute path to the Flutter SDK root folder (containing `bin`). If provided, the extension will use that binary specifically, useful if `flutter` is not in PATH.

Grant Raycast in System Settings → Privacy & Security → Accessibility to allow terminal automation (Warp).

## Requirements

- macOS
- Flutter installed and available in shell PATH (or configure your shell for Terminal.app).

## Usage

1. Open Raycast.
2. Search for "Flutter" then choose the desired action. You can add optional arguments (e.g., `--flavor prod`, `-d ios`).
3. Alternatively, use directly: "Flutter Run", "Flutter Pub Get", "Flutter Clean".
4. If needed, set the `Project Path` preference in the extension preferences.

## Installation

### From Raycast Store

- Open Raycast → Store → search for "Flutter Utils" → Install.

### From source (development)

1. Clone this repository.
2. Install dependencies: `npm install`.
3. Run in development mode: `npm run dev`.
4. Build the extension: `npm run build`.

## Development

- Install deps: `npm install`
- Run dev: `npm run dev`
- Lint: `npm run lint`
