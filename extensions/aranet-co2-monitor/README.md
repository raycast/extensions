# Aranet CO2 Monitor

### Prerequisites

1. **Enable Bluetooth** on your Mac and ensure your Aranet is nearby and powered on.
2. Install the [Aranet Home app](https://apps.apple.com/us/app/aranet-home/id1392378465) on your Mac.
3. Add a new device in the Aranet Home app to connect to your Aranet via bluetooth.

### Configuration

1. **Permissions**: The first time you run the extension, macOS will ask for Bluetooth permissions.
2. **Automatic Connection**: By default, the extension will automatically scan for and connect to the nearest Aranet device.
3. **Optional Device Specification**: If you have multiple devices or want to connect to a specific one:
    *   Run the extension
    *   Find the UUID of the specific device.
    *   Enter it in the **Aranet UUID** preference in Raycast Settings.

### Compatibility
- This extension has only been tested with the Aranet4 Home device.

## Troubleshooting

*   **"Aranet service not found"**: Ensure your device firmware is up to date using the official Aranet Home app.
*   **Connection Issues**: Toggle Bluetooth on your Mac or restart the Aranet (remove/insert batteries). Ensure you are close enough to the Aranet device.