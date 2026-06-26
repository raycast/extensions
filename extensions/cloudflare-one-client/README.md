![Cover](assets/cover.png)
# Cloudflare One Client

Manage the [Cloudflare One Client (WARP)](https://one.dash.cloudflare.com/) from Raycast.

## Features

- **Connect / Disconnect** — Toggle WARP with one action
- **Switch Mode** — Change WARP mode from an inline submenu; auto-reconnects if already connected
- **Auto-refresh** — Status updates every 5 seconds

## Requirements

- [Cloudflare WARP Client](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/download-warp/) installed at the default path:
  `C:\Program Files\Cloudflare\Cloudflare WARP\warp-cli.exe`

## WARP Modes

| Mode | Description |
|---|---|
| Traffic and DNS (UDP) | Full tunnel — DNS + traffic encrypted via WARP |
| Traffic and DNS (HTTPS) | Full tunnel with DNS over HTTPS |
| Traffic and DNS (TLS) | Full tunnel with DNS over TLS |
| DNS only (HTTPS) | DNS queries only via DoH |
| DNS only (TLS) | DNS queries only via DoT |
| Local proxy | Local SOCKS5 / HTTP proxy |
| Traffic only | Tunnel traffic, system DNS unchanged |
