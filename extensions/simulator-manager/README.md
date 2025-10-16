# Simulator Manager

Easily manage iOS simulators and Android emulators directly from Raycast.

## Features

- 📱 List all available iOS simulators and Android emulators
- 🚀 Boot, shutdown, and open simulators/emulators with a single click
- 🔍 Filter devices by type (iOS or Android)
- 📊 View device details including OS version and running status
- 🎨 Visual indicators for running devices
- 🔧 Configure custom Android SDK path

## Requirements

- **iOS Simulators**: Xcode must be installed
- **Android Emulators**: Android SDK must be installed (can be configured in preferences)

## Usage

1. Open the extension and view all your available simulators and emulators
2. Use the dropdown to filter by device type (iOS or Android)
3. Use the search to find specific devices
4. Click on a device to see available actions:
    - Boot Simulator/Emulator
    - Shutdown Simulator/Emulator
    - Open Simulator/Emulator
    - Copy Device ID

## Configuration

### Android SDK Path

If your Android SDK is installed in a non-standard location, you can configure the path in the extension preferences:

1. Open the extension
2. Click on "Configure Android SDK Path" in the action panel
3. Enter the path to your Android SDK installation (e.g., `/Users/username/Library/Android/sdk`)

## Troubleshooting

- **Android emulators not showing**: Make sure the Android SDK path is correctly configured in preferences
- **Cannot boot simulator**: Ensure you have the necessary permissions and that the device is not already running
- **Emulator not responding**: Try refreshing the list (⌘R) or restarting the extension

## Feedback

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/raycast/extensions/issues/new/choose) on the Raycast Extensions repository.
