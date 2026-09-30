# Sidecar Connect

Connect, disconnect, and manage Sidecar from Raycast without opening Control Center or digging through System Settings.

Sidecar Connect is built for people who already use Sidecar and want a faster workflow in Raycast. It gives you quick commands to connect to your iPad, disconnect active sessions, toggle the current state, and manage favorite or recently used devices.

## Commands

- **Manage Sidecar**: Browse connected, available, and recently used devices. Connect, disconnect, favorite devices, remove history entries, refresh discovery, and open Display Settings.
- **Quick Connect Sidecar**: Instantly connect to your default or favorite iPad.
- **Toggle Sidecar**: Connect if Sidecar is off, or disconnect if the selected device is already connected.
- **Disconnect Sidecar**: Disconnect all active Sidecar sessions.

## Why It Feels Fast

- Uses a bundled native Swift helper for local Sidecar discovery and connection
- No UI scripting, no Control Center clicks, and no System Settings automation
- Remembers favorites and recently used devices for quicker reconnects

## Requirements

- Raycast on macOS
- A Mac and iPad that support Sidecar
- The same Apple Account on both devices
- Wi-Fi, Bluetooth, and Handoff enabled on both devices

For Apple's device and OS compatibility list, see [Sidecar system requirements](https://support.apple.com/102597).

## Setup

1. Install the extension.
2. Open **Manage Sidecar** and confirm that your iPad appears.
3. Connect once and optionally mark the device as a favorite.
4. Optionally set **Default Device** in the extension preferences.
5. Use **Quick Connect Sidecar** or **Toggle Sidecar** for everyday use.

No additional downloads are required for the store version of this extension.

## Preferences

| Preference | Description |
| --- | --- |
| **Default Device** | The iPad name to prefer for **Toggle Sidecar** and **Quick Connect Sidecar**. If empty, the extension falls back to your favorite device, then another available device. |

## Privacy

All device discovery and connection actions run locally on your Mac. This extension does not send Sidecar device information to any third-party service.

## Troubleshooting

- **No devices found**: Make sure both devices support Sidecar, are signed in to the same Apple Account, and have Wi-Fi, Bluetooth, and Handoff enabled.
- **Connection fails**: Confirm that Sidecar works from macOS Display Settings first, then retry in Raycast. If needed, toggle Bluetooth, reconnect the USB cable, or restart the iPad.
- **Quick Connect chose the wrong device**: Set **Default Device** in preferences or mark one iPad as a favorite from **Manage Sidecar**.
- **Device name mismatch**: Check the exact device name on your iPad in **Settings > General > About**.
- **It stopped working after a macOS update**: Major macOS releases can change Sidecar behavior. Check for an extension update and verify that Sidecar still works in Display Settings.
