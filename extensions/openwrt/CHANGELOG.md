# OpenWrt Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Added **Router Status** command displaying uptime, load average, CPU/temperature telemetry, memory/swap/storage, conntrack stats, network interfaces, Wi-Fi radios, cached offline fallback, and confirmed router reboot.
- Added **Search Clients** command merging DHCP/DHCPv6 leases, host hints, and `iwinfo` Wi-Fi associations with IPv4/IPv6/MAC copy actions, router-side ping, static DHCP lease assignment, and confirmed Wi-Fi client disconnect.
- Added **Manage Services** command for inspecting and controlling OpenWrt `init.d` services and network/VPN interfaces with safe primary actions, confirmed destructive controls, live WireGuard peer stats, and filtered `logread` logs.
- Added **Quick Status Check** command for parallel router, WAN, Wi-Fi, pinned service, local DNS, and ICMP ping checks plus ad-hoc IP/domain ping and DNS probes.
- Added **DHCP & Local DNS** command for viewing, adding, and deleting UCI static DHCP leases and local DNS hostname mappings with automatic `dnsmasq` reload.
- Added **Wi-Fi & QR Code** command for inspecting wireless SSIDs, generating scannable Wi-Fi QR codes and copying passphrases or QR payloads to a concealed clipboard on demand, toggling SSIDs and radios, and scanning nearby Wi-Fi channels.
- Added **System Logs** command for searching and filtering live `logread` syslog entries by severity, daemon, and line limit (`100` / `250` / `500`).
- Added **Connections & Processes** command for inspecting active NAT conntrack flows sorted by traffic and monitoring or signaling (`SIGTERM` / `SIGKILL`) running router processes by CPU or memory usage.
- Added **Firewall & UPnP** command for inspecting, filtering, adding, toggling, and deleting UCI port forwards and viewing or removing active UPnP / NAT-PMP leases.
