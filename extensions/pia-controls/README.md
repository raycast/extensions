# Private Internet Access Controller

PIA Controls lets you control your Private Internet Access VPN from within Raycast: connect, disconnect, switch region, and check your status without opening the app.

Built on `piactl`, PIA's own command-line interface, so the desktop app stays the source of truth. Your credentials are never read, stored, or handled by this extension.

## Commands

### Connect

Connects the VPN using the region PIA currently has selected.

### Disconnect

Disconnects the VPN.

### Status

Shows the connection state, and the region and VPN IP when connected.

### Connect to Region

Browses every PIA region with its country flag, searchable by country, city, or region id. Regions that support port forwarding are tagged, as are geo-located regions (where the IP is registered in a country but the server is hosted elsewhere). Includes an Automatic entry that lets PIA pick the fastest region.

Star the regions you use often to keep them at the top; the last five you connected to are remembered automatically.

### Toggle Connection

Connects when disconnected, disconnects when connected. Handy as a single hotkey.

### Connect Most Recent

Reconnects to the region you used last.

## Settings

From the action panel (`⌘K`) on any row:

- **Port forwarding** (`⌘⇧P`) — request a forwarded port on the next connection
- **LAN access** (`⌘⇧L`) — allow or block local network traffic while connected
- **Protocol** — switch between WireGuard and OpenVPN

Once a port is forwarded it is shown in the status row and can be copied.

## Requirements

- macOS with the [Private Internet Access](https://www.privateinternetaccess.com/) app installed and signed in.
- PIA's command-line helper. Enable it in **PIA → Settings → General → Install PIA command-line helper**.

The extension checks for both and tells you what is missing if either is not ready.

> **Connecting while the PIA app is closed:** PIA's background service is inactive unless the app is running. To connect from Raycast without opening PIA first, turn on **Allow PIA to run in the background** in PIA's settings. This extension will never change that setting for you.

## Privacy

- **No credentials.** Sign-in stays entirely in the PIA app.
- **No third-party requests.** Flags ship with the extension instead of loading from an image CDN, so browsing regions does not reveal which countries you are looking at. The only network call is to PIA's own public server list.
- **No surprise connections.** Nothing connects, disconnects, or changes a PIA setting unless you trigger it.
- **The IP you see is the right one.** `piactl` reports your ISP address under `pubip` even while the tunnel is up, so the extension shows your VPN IP when connected, and only shows your real IP when disconnected, clearly labelled as unprotected.

## Credits

Country flags are rendered from [flag-icons](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis, used under the MIT License.
