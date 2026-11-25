# OpenWrt

Monitor your OpenWrt router's uptime, load, memory, interfaces, and Wi-Fi radios, search DHCP & Wi-Fi clients, manage static DHCP/DNS, Wi-Fi QR codes, services, system logs, NAT connections, processes, and firewall/UPnP rules, and run quick LAN/WAN health checks from Raycast via ubus JSON-RPC.

## Prerequisites

1. An **OpenWrt / ImmortalWrt** router reachable on your LAN running `uhttpd`, `uhttpd-mod-ubus`, and `rpcd` (included in standard LuCI installations).
2. Router user credentials with ACL permissions for `system`, `network`, `network.wireless`, `network.interface`, `network.interface.*`, `luci`, `luci-rpc`, `luci.upnp`, `iwinfo`, `hostapd.*`, `rc`, `service`, `uci`, and `file` (`root` has full access out of the box).
3. Optional packages for richer telemetry and diagnostics:
   - `rpcd-mod-luci` (ubus `luci-rpc` helpers: `getDHCPLeases`, `getHostHints`, `getNetworkDevices`, plus `luci` status/init/conntrack/process helpers)
   - `rpcd-mod-iwinfo` (Wi-Fi radio, station, and channel scan details)
   - `rpcd-mod-file` (router-side `ping`, `nslookup`, `logread`, `/tmp/dhcp.leases` fallback, conntrack reads, and `/bin/kill`)
   - `wireguard-tools` (`wg` live WireGuard peer handshake & byte counters)
   - `miniupnpd` / `luci-app-upnp` (`luci.upnp` ubus object for inspecting and removing active UPnP / NAT-PMP leases)

## Commands

- **Router Status**: View uptime, load average, CPU usage, temperatures, memory/swap, overlay storage, conntrack utilization, network interfaces, and Wi-Fi radios, or trigger a confirmed reboot.
- **Search Clients**: Search connected Wi-Fi stations, DHCP/DHCPv6 leases, and static LAN neighbors by hostname, IP, MAC, or SSID, copy IPv4/IPv6/MAC addresses, ping clients from the router, assign static DHCP leases, or deauthenticate a Wi-Fi client.
- **Manage Services**: Filter, inspect, start, stop, restart, reload, and enable/disable OpenWrt `init.d` services (`sing-box`, `dnsmasq`, `firewall`, etc.) and network/VPN interfaces (including live WireGuard peer stats), and view filtered `logread` syslog entries. Defaults safely on `Enter` to viewing logs (when running/up) or starting (when stopped/down), with **Restart** on `Cmd+Shift+R` / `Ctrl+Shift+R`.
- **Quick Status Check**: Run parallel checks on router health, WAN uplink, Wi-Fi radios, pinned services, local DNS resolution (`127.0.0.1`), and ICMP ping targets, plus type any IP or domain for ad-hoc router ping or DNS probes.
- **DHCP & Local DNS**: View, search, add, and remove UCI static DHCP reservations (`dhcp.@host`) and local DNS hostname mappings (`dhcp.@domain`), automatically committing and reloading `dnsmasq`.
- **Wi-Fi & QR Code**: Inspect configured wireless SSIDs, bands, channels, encryption, and connected client counts; enable or disable SSIDs and radios; scan nearby Wi-Fi channels (`iwinfo.scan`); and generate scannable Wi-Fi QR codes or copy passphrases and QR payloads (using concealed clipboard entries) on demand.
- **System Logs**: Search and filter live OpenWrt syslog entries (`/sbin/logread`) by severity (`err`, `warn`, `notice`), daemon, and line limit (`100` / `250` / `500`), and copy individual or filtered log lines.
- **Connections & Processes**: Inspect active NAT connections (`conntrack`) sorted by traffic volume with client hostname enrichment, and monitor top router processes by CPU or memory usage with confirmed `SIGTERM` / `SIGKILL` signaling.
- **Firewall & UPnP**: Inspect, filter, add, enable/disable, and delete UCI firewall port forwards (`firewall.@redirect`), and view or remove active UPnP / NAT-PMP leases via `luci.upnp`.

## Preferences

| Preference                   | Default                                          | Description                                                                                                          |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Router URL**               | `http://192.168.1.1`                             | Base URL or IP/hostname of your OpenWrt router (`/ubus` is appended automatically).                                  |
| **Username**                 | `root`                                           | OpenWrt LuCI / ubus login username.                                                                                  |
| **Password**                 | _(empty)_                                        | OpenWrt LuCI / ubus password.                                                                                        |
| **Self-Signed HTTPS**        | Enabled                                          | Accept `uhttpd`'s default self-signed TLS certificate for router connections only.                                   |
| **Quick Check Ping Targets** | `1.1.1.1, 8.8.8.8`                               | Comma-separated IPs or hostnames probed during **Quick Status Check**.                                               |
| **DNS Check Domain**         | `cloudflare.com`                                 | Domain queried against the router's local DNS resolver (`127.0.0.1`).                                                |
| **Pinned Services**          | `dnsmasq, firewall, uhttpd, dropbear, wireguard` | Comma-separated service or interface names highlighted in **Manage Services** and checked in **Quick Status Check**. |

## Behavior & Security

- **Scoped TLS Handling**: Self-signed certificate acceptance applies only to requests targeting your configured OpenWrt router and never disables TLS verification globally. Same-host HTTP redirects (common with `uhttpd` `rfc1918_redirect` from HTTP to HTTPS) are followed automatically without downgrading HTTPS to HTTP while preserving JSON-RPC `POST` payloads.
- **Session Caching**: Authenticated `ubus_rpc_session` tokens are cached in memory and automatically refreshed before expiry or on `-32002` access-denied responses.
- **Stale-While-Revalidate Snapshots**: Last successful router status, client, service, DHCP/DNS, Wi-Fi config, log, connection/process, firewall/UPnP, and health-check snapshots are persisted via Raycast's local `Cache` (without credentials), displayed immediately with `Cached (<age>)` or `Stale (<age> · Refresh failed)` indicators, and updated automatically when live data arrives. Use **Clear Cached Data** in the action menu to purge stored snapshots and clear the active session.
- **On-Demand Wi-Fi Passphrases**: Wi-Fi passphrases (`wireless.*.key`) are fetched strictly on demand when opening the QR code view or copying a Wi-Fi password, are copied to the clipboard with `concealed: true` (for both passphrases and QR payloads), and are never persisted in Raycast's local cache.
- **Guarded Destructive Actions**: Stopping services, disabling any service at boot, rebooting the router, disconnecting Wi-Fi clients, stopping/restarting core services (`network`, `firewall`, `uhttpd`, `dropbear`, `wpad`, `rpcd`, `dnsmasq`), bringing down interfaces or restarting core interfaces (`lan`, `wan`), deleting static DHCP leases or DNS records, disabling Wi-Fi SSIDs, toggling (enabling or disabling) Wi-Fi radios, signaling processes (`SIGTERM` / `SIGKILL`), toggling (enabling or disabling) or deleting firewall port forwards, and removing UPnP leases always prompt for confirmation first (and restarting `lan` safely reloads `network` via `rc.init`).
