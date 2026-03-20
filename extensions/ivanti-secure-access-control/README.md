# Ivanti Secure Access Control

Control Ivanti Secure Access connections from Raycast on macOS.

This extension reads configured VPN connections from the local Ivanti connection store, shows them in a Raycast list, reads live state from the native Ivanti client through AppleScript, and triggers connect or disconnect actions through the Ivanti status menu.

## What It Does

- Lists locally configured Ivanti connections.
- Shows server URL and connection source for each entry.
- Tries to resolve the live connection state from the running Ivanti app.
- Supports connect, disconnect, toggle, refresh, and copy server URL actions.
- Opens the native Ivanti app when manual intervention is needed.

## Requirements

- macOS with [Raycast](https://www.raycast.com/) installed.
- Ivanti Secure Access installed at `/Applications/Ivanti Secure Access.app`.
- At least one saved connection in `/Library/Application Support/Pulse Secure/Pulse/connstore.dat`.
- macOS Automation permission allowing Raycast to control Ivanti Secure Access.

## How It Works

- Reads configured connections from Ivanti's local connection store, so saved entries can still appear even before the app is fully interactive.
- Reads live status from the running Ivanti client through AppleScript when available.
- Sends connect and disconnect actions through the Ivanti status menu.
- Disconnects other active Ivanti connections before starting a new connection request.
- Falls back to saved connection data when live status is unavailable, in which case some items may show `Unknown`.


## Troubleshooting

If no saved connections appear:

- confirm that `/Library/Application Support/Pulse Secure/Pulse/connstore.dat` exists
- open Ivanti once and create or import at least one connection

If status is missing or actions fail:

- open `Ivanti Secure Access.app` once manually
- grant Raycast Automation permission in macOS Settings if prompted
- make sure the Ivanti status menu is visible and the connection name matches the saved entry
- refresh the Raycast command and try again

## Limitations

- The extension depends on Ivanti's current `connstore.dat` format and AppleScript-accessible UI behavior.
- Connect and disconnect actions rely on the Ivanti status menu labels exposed by the macOS client.
- If Ivanti changes its menu structure, AppleScript interface, or connection store format, the extension will need an update.
