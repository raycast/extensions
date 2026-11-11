# Windscribe VPN for Raycast

Control the Windscribe desktop app on macOS from Raycast using your existing Windscribe session. This is an unofficial community extension.

## Setup

1. Install [Windscribe for macOS](https://windscribe.com/download) in `/Applications` or `~/Applications` and sign in to the desktop app.
2. Use English in the Windscribe desktop app so the extension can read the CLI status.
3. Open **Windscribe Status** in Raycast to check your connection.

The extension runs the CLI that ships with the Windscribe desktop app.

## Commands

| Search in Raycast            | Result                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| **Connect Windscribe**       | Connect to the last used location, or Best Location if there is no previous location.              |
| **Connect to Best Location** | Let Windscribe choose a location. If you’re already connected, disconnect first.                   |
| **Disconnect Windscribe**    | Disconnect the VPN.                                                                                |
| **Toggle Windscribe**        | Connect or disconnect based on the current VPN state.                                              |
| **Windscribe Status**        | See the current state, location, and protocol. Use the action panel to refresh or open Windscribe. |

Set a hotkey for any command in **Raycast Settings → Extensions → Windscribe VPN**.

## Troubleshooting

- If the status is unavailable, open Windscribe, check that you’re signed in, then refresh. This extension reads the English CLI output on Windscribe 2.24.12 and newer versions that use either supported status format.
- If Raycast reports that Windscribe is busy, wait for the current VPN operation to finish, then retry.
- If a connection change cannot be confirmed within 60 seconds, check **Windscribe Status** or the desktop app before trying again.
