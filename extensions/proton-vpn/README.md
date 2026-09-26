# Proton VPN for Raycast

Control the Proton VPN macOS app from Raycast: check the status, connect,
disconnect, and switch countries without leaving the keyboard.

The extension drives the app you already have. It uses only the installed
Proton VPN app and built-in macOS tools (`scutil`, `defaults`, `sqlite3`,
`open`, `osascript`). It needs no extra programs, no credentials, and no
WireGuard configuration files.

## Requirements

- macOS with the [Proton VPN app](https://protonvpn.com/download-macos)
  installed.
- You signed in to the app and connected at least once. The first connection
  registers the system VPN profile that this extension reads.
- A paid Proton VPN plan for country selection. The free plan cannot select a
  country in the official app either.

## Commands

| Command | What it does |
| --- | --- |
| Manage Connection | The hub. The top section shows the live status with disconnect and reconnect, plus a fastest-server action. Below it are the recent countries, then all countries nearest first with distance, load, and server count. The connected country has a green mark. |
| Switch Country | Type a country name or a two-letter code and connect to the fastest server there, straight from the root search. With no argument, it connects to the fastest server overall. |
| Toggle Connection | Connect if disconnected, disconnect if connected. Made for a global hotkey. |
| Menu Bar Status | A status icon with the country flag, connect and disconnect actions, and a submenu of the nearest countries. During a switch, the icon shows the progress and the target flag. |

In the hub, every item also offers these shortcuts: `Cmd+D` to disconnect,
`Cmd+F` for the fastest server, and `Cmd+O` to open the app.

## How it works

- **Status, quick connect, and quick disconnect** use the system VPN service
  that the app registers with macOS (`scutil --nc`).
- **The country list** comes from the local server database of the app
  (`database.sqlite` in the app container): country, city, coordinates, tier,
  and live load. The extension computes the distances from your current
  country as the app recorded it.
- **A country switch** writes a connection profile ("Raycast Switch") into the
  preferences of the app, marks it as the auto-connect profile, and relaunches
  the app in the background. The app then finds the fastest server in that
  country and connects by itself. The extension clears the auto-connect flag
  immediately after, so a normal app launch does not auto-connect.
- **A full disconnect**: when the app made the connection, macOS enforces an
  on-demand rule that reconnects the tunnel after `scutil --nc stop`. Only the
  app can disable that rule, and it does so while it quits. The extension
  starts that path without the confirmation dialog (it clears the
  `LaunchedBefore` flag for a moment), so the app disconnects cleanly and
  quits.

## Known side effects

- A profile named "Raycast Switch" appears in the profile list of the app. The
  extension reuses and overwrites this profile on every country switch.
- A country switch and a full disconnect quit and relaunch the Proton VPN app.
  A switch takes approximately 15 to 25 seconds.
- The extension restarts the user-level `cfprefsd` daemon after it writes the
  preferences, so the app reads the new values.
- macOS asks for permission one time when Raycast sends the quit command to the
  Proton VPN app ("Raycast wants to control ProtonVPN").

## Privacy

The extension sends no data anywhere. It reads and writes only on your Mac,
and it includes no analytics.

## Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by Proton AG.
"Proton" and "Proton VPN" are trademarks of Proton AG. The extension icon is
derived from the Proton VPN app icon and is used to identify the app that the
extension controls.
