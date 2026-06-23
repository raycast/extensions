# Proton VPN

Control **Proton VPN** from Raycast — see your connection status in the menu
bar, and connect, disconnect, or toggle the tunnel without opening the app.

This extension drives the official Proton VPN macOS app's tunnel through
`scutil` (via the [`@kud/protonvpn`](https://github.com/kud/protonvpn) engine),
so you keep Smart Protocol, NetShield, and the kill switch. It stores no
credentials and never reimplements the VPN — the official app stays the source
of truth.

## Commands

- **VPN Status** — a menu-bar item showing whether you're connected, to which IP
  and interface, with Connect / Disconnect / Toggle actions inline.
- **Toggle VPN** — connect if disconnected, disconnect if connected.
- **Connect VPN** — start the configured tunnel.
- **Disconnect VPN** — stop the tunnel.
- **Open Proton VPN** — bring the app to the front.

## The kill-switch caveat

Proton's kill switch is implemented as a macOS **on-demand rule**, so the system
re-establishes the tunnel immediately after a disconnect. The extension detects
this and tells you when a disconnect will bounce back — a lasting disconnect
means disabling the kill switch in the Proton VPN app.

## Requirements

- macOS with the official **Proton VPN** app installed.
- Connect once in the app so its `ProtonVPN` network service exists.
