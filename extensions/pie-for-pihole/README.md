# Pie for Pi-hole

![banner](https://user-images.githubusercontent.com/22849100/173755322-628ef6ae-bb12-46f6-aa6a-fc789821df85.png)

## Overview

Control and monitor your Pi-hole instance from Raycast. Supports both **Pi-hole v5** and **Pi-hole v6** with full API coverage.

## Setup

### Pi-hole v5

1. **Pi-hole URL** — Your Pi-hole IP address or hostname (e.g. `192.168.1.2` or `pi.hole`)
2. **API Token** — Found in your admin dashboard: Settings → API → Show API Token

### Pi-hole v6

1. **Pi-hole URL** — Your Pi-hole IP address or hostname
2. **Password** — Your Pi-hole admin password (or an app password)
3. **TOTP Secret** *(optional)* — Base32 secret for 2FA. Leave empty if 2FA is disabled or you use an app password.

## Commands

| Command | Description | v5 | v6 |
| --- | --- | :---: | :---: |
| Toggle Pi-Hole | Enable or disable Pi-hole blocking | ✅ | ✅ |
| Pi-Hole Dashboard | View stats, query types, and system info | ✅ | ✅ |
| Query Log | Browse query logs with time range and status filtering | ✅ | ✅ |
| Top Queries | View top allowed and blocked domains | ✅ | ✅ |
| Clients & Devices | View top clients and network devices | ✅ | ✅ |
| Manage Domains | View, add, and delete allowlist/blocklist domains | ✅ | ✅ |
| Add Domain | Quickly add a domain to allowlist or blocklist | ✅ | ✅ |
| Manage Subscription Lists | View, add, toggle, and delete subscription lists | — | ✅ |
| Add Subscription List | Quickly add a subscription list | — | ✅ |
| Check Domain | Search if a domain is blocked or allowed | — | ✅ |
| Update Gravity | Update Pi-hole gravity database | — | ✅ |
| Restart DNS | Restart the DNS resolver | — | ✅ |
| Flush Logs | Clear Pi-hole query logs | — | ✅ |
| Backup Config | Download a Pi-hole Teleporter backup | — | ✅ |
| Groups & Clients | Manage groups and configured clients | — | ✅ |
| View Configuration | View full Pi-hole configuration as JSON | — | ✅ |

## Feedback

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/raycast/extensions/issues).
