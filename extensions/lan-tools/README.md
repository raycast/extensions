# LAN Tools

Inventory your home network and test your internet connection, right from
Raycast.

## Features

- **My LAN** — sweep the network and browse every device with its name, IP,
  MAC, vendor, status, and advertised services (mDNS). Devices stream in as
  they resolve; a device row opens a detail panel with ports, capabilities, and
  one-key actions (Ping / Traceroute / DNS Lookup / Copy / Open Web Panel / SSH).
- **This Mac** — this Mac's network identity, Wi-Fi RF state (SSID, BSSID,
  channel, signal), public IP, DNS, and neighbor channel summary.
- **Speed Test** — measure internet download, upload, and latency via
  pure-HTTP providers (Cloudflare default, Yandex). No external binary.

> Ping / Traceroute / DNS Lookup ship as per-device actions inside **My LAN**.

## Permissions

The network commands need **Local Network** permission for Raycast. macOS will
prompt; enable it in **System Settings → Privacy & Security → Local Network**
if you skipped it.

## FAQ

### I don't see my devices

The scan reads the OS neighbor table (`arp -a -n`) — Raycast needs **Local
Network** permission to see it. Grant it in System Settings → Privacy &
Security → Local Network.

### My VPN hides devices

A VPN tunnel changes what the neighbor table reports (tunnel peers, multicast
groups) and can drop local-subnet replies. Disconnect or split-tunnel the LAN.

## Development

```bash
npx ray dev      # hot-reload dev server
npx ray build    # distribution build
npx ray lint     # ESLint + Prettier (zero issues required)
npx tsc --noEmit # typecheck
```

## How it works

- **Discovery**: `arp -a -n` — the `-n` avoids the reverse-DNS-per-IP hang
  that plain `arp -a` has. MAC is the device identity key; IP is volatile.
- **Names**: `dns-sd` mDNS browsing, streamed into the list as each resolves.
- **Vendor**: a compact build of the IEEE OUI registry shipped in
  `assets/oui.compact.txt`.
- **Speed Test**: pure HTTP (`fetch` only) — Cloudflare and Yandex endpoints.
  No `brew` dependency, no downloaded binary.
- **Storage**: Raycast LocalStorage keeps the inventory keyed to the network it
  was swept on, so re-opening on the same LAN returns instantly.

## License

MIT