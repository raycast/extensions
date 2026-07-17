# Home Suite Control

Send natural-language commands to your self-hosted
[Home Suite](https://github.com/jayore/HomeSuite) server without leaving
Raycast. Successful commands are saved as recent commands, and frequently used
commands can be kept as ordered favorites.

## Requirements

- Raycast for macOS
- A running Home Suite server reachable from your Mac over a trusted LAN or VPN
- The `HOMESUITE_HTTP_API_KEY` configured on that server

Home Suite is an advanced-alpha, self-hosted companion for Home Assistant. See
the [Home Suite installation guide](https://github.com/jayore/HomeSuite/blob/main/docs/INSTALL.md)
before configuring this extension.

## Setup

1. Install and start Home Suite on a Raspberry Pi or another supported
   Debian-like host.
2. From your Mac, confirm that the server is reachable:

   ```bash
   curl http://homesuite.local:8765/health
   ```

3. On the Home Suite host, open `~/homesuite/private_config.py` and copy the
   value assigned to `HOMESUITE_HTTP_API_KEY`. A fresh installation generates
   this value automatically.
4. Open **Send Home Command** in Raycast.
5. Enter the extension preferences when prompted:

   - **Home Suite Base URL:** For example, `http://homesuite.local:8765`
   - **Home Suite API Key:** The value of `HOMESUITE_HTTP_API_KEY`

Do not append `/command` to the base URL. A trailing slash is accepted.

## Usage

Open **Send Home Command** and type a command such as:

- `turn on the living room lights`
- `pause`
- `what's playing?`
- `lights to 30%`

Press Return to send the typed command. Successful, understood commands appear
in **Recent**. Use the action panel to add commands to **Favorites**, reorder
favorites, edit a command in the search bar, or remove saved entries.

## Troubleshooting

- **Connection failed:** Confirm that the Home Suite host is running, that port
  `8765` is reachable from the Mac, and that the base URL uses the correct host.
- **HTTP 403:** Confirm that the extension API key exactly matches
  `HOMESUITE_HTTP_API_KEY` in `private_config.py`.
- **Command was not understood:** Try a more explicit room, device, scene, or
  media name. Home Suite uses the names configured in Home Assistant and its
  deployment configuration.

See the full
[Home Suite API documentation](https://github.com/jayore/HomeSuite/blob/main/docs/API.md)
for server configuration and network-security guidance.

## Privacy and Security

The extension sends command text and authentication directly from Raycast to
the Home Suite base URL you configure. It does not include analytics or send
data to another service.

The Home Suite API uses HTTP on the local network by default. Keep it on a
trusted LAN or VPN, protect the API key, and do not expose port `8765` directly
to the internet.
