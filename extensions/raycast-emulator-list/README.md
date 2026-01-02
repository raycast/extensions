# List Emulators

A Raycast extension to quickly list and launch Android emulators and iOS (watchOS, iPadOS, tvOS, visionOS) simulators directly from Raycast.

## Features

- **Android Emulators** — List all available Android Virtual Devices (AVDs) and start them with a single action
- **iOS Simulators** — List all available iOS, watchOS, iPadOS, tvOS, and visionOS simulators (macOS only)
- **Cross-platform** — Works on both macOS and Windows
- **Search** — Quickly filter emulators by name

## Requirements

### Android Emulators

The `emulator` command must be available in your PATH. This is typically located at:

- **macOS/Linux**: `$ANDROID_HOME/emulator/emulator`
- **Windows**: `%ANDROID_HOME%\emulator\emulator.exe`

To add it to your PATH, add the following to your shell config (`.zshrc`, `.bashrc`, etc.):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

> **Note**: After modifying your shell config, restart your terminal or run `source ~/.zshrc` (or equivalent).

### iOS Simulators (macOS only)

- Xcode must be installed with the iOS Simulator component
- The `xcrun` command (included with Xcode Command Line Tools) must be available

iOS simulators are **only available on macOS**. On Windows, an informational message will be displayed instead.

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

1. Open Raycast
2. Search for "List Emulators"
3. Browse or search for your desired emulator/simulator
4. Press `Enter` to start the selected device

## Actions

| Device Type | Action | Description |
|-------------|--------|-------------|
| Android Emulator | Start Emulator | Launches the selected AVD |
| iOS Simulator | Boot Simulator | Boots the simulator and opens the Simulator app |

## Development

```bash
# Start development server
npm run dev

# Lint code
npm run lint

# Fix lint issues
npm run fix-lint

# Build for production
npm run build

# Publish to Raycast Store
npm run publish
```

## License

MIT
