# Private Internet Access

Control your Private Internet Access VPN without leaving Raycast — connect, switch country, and check your status in a keystroke.

Built on `piactl`, PIA's own command-line interface, so the desktop app stays the source of truth. Your credentials are never read, stored, or handled by this extension.

## Features

**Connect anywhere, fast.** Every PIA region with its country flag, searchable by country, city, or region id. Pick one and you're connected — no need to open the PIA window.

**Status at a glance.** Connection state, active region, VPN IP, protocol, and your forwarded port, all on one row.

**Favorites and recents.** Star the handful of regions you actually use and they stay at the top. Your last five connections are remembered automatically.

**Built for port forwarding.** Regions that support it are tagged, the active forwarded port is shown and copyable, and you can toggle the request without digging through settings.

**Honest about geo-located regions.** PIA registers some IPs in a country while hosting the server elsewhere. Those are tagged, so you know what you're actually getting.

**Hotkey-friendly.** Toggle Connection and Connect Most Recent run silently — Raycast closes and a HUD confirms the result. Bind them and never open a window again.

## Commands

| Command | What it does |
|---|---|
| **Open Detailed** | Browse regions, check status, connect, disconnect, and change settings |
| **Toggle Connection** | Connect if disconnected, disconnect if connected |
| **Connect Most Recent** | Reconnect to the region you used last |

## Settings

From the action panel (`⌘K`) on the status row:

- **Port forwarding** (`⌘⇧P`) — request a forwarded port on the next connection
- **LAN access** (`⌘⇧L`) — allow or block local network traffic while connected
- **Protocol** — switch between WireGuard and OpenVPN

## Requirements

- macOS with the [Private Internet Access](https://www.privateinternetaccess.com/download/mac-vpn) app installed and signed in.
- PIA's command-line helper. Enable it in **PIA → Settings → General → Install PIA command-line helper**.

The extension checks for both and tells you exactly what's missing if either isn't ready.

> **Connecting while the PIA app is closed:** PIA's background service is inactive unless the app is running. To connect from Raycast without opening PIA first, turn on **Allow PIA to run in the background** in PIA's settings. This extension will never change that setting for you.

## Privacy

- **No credentials.** Sign-in stays entirely inside the PIA app.
- **No third-party requests.** Flags ship with the extension instead of loading from an image CDN, so browsing regions doesn't tell anyone which countries you're looking at. The only network call is to PIA's own public server list.
- **No surprise connections.** Nothing connects, disconnects, or changes a PIA setting unless you trigger it.
- **The IP you see is the right one.** `piactl` reports your ISP address under `pubip` even while the tunnel is up, so this extension shows your VPN IP when connected — and only shows your real IP when you're disconnected, clearly labelled as unprotected.

## Credits

Country flags are rendered from [flag-icons](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis, used under the MIT License.
