<div align="center">

# Pi-hole

</div>

<div align="center">
  <a href="https://github.com/treyg">
    <img src="https://img.shields.io/github/followers/treyg?label=Follow%20treyg&style=social" alt="Follow @treyg">
  </a>
  <a href="https://www.raycast.com/treyg/pi-hole">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Pi-hole on Raycast store.">
  </a>

  <p style="margin-top: 20px;">Manage your Pi-hole instance directly from Raycast - control blocking, view domains, and monitor status.</p>

</div>

## Features

- **Quick status monitoring** - View Pi-hole status and statistics at a glance
- **Instant blocking control** - Enable/disable Pi-hole DNS blocking with one command
- **Timed disable** - Temporarily disable Pi-hole for a specific duration
- **Domain management** - View and query domains in allow/deny lists
- **Web dashboard access** - Quick access to Pi-hole admin interface
- **Real-time statistics** - Monitor blocked queries, total queries, and blocking percentage

## Commands

### Pi-hole Status

- View current Pi-hole status (enabled/disabled)
- Display blocking statistics and query counts
- Monitor system performance metrics

### Enable Pi-hole

- Instantly enable Pi-hole blocking
- Restore ad and tracker blocking functionality

### Disable Pi-hole

- Quickly disable Pi-hole DNS blocking
- Temporarily allow all DNS queries through

### Disable Pi-hole (Timed)

- Disable Pi-hole for a specific duration
- Supports various time formats (5m, 1h, 30s)
- Automatically re-enables after the specified time

### View Domain Lists

- Browse domains in your allow and deny lists
- Search and filter through domain entries
- View list statistics and management options

### Query Domain

- Check if a specific domain is blocked by Pi-hole
- Verify domain blocking status
- Troubleshoot DNS filtering issues

### Open Web Dashboard

- Launch Pi-hole admin dashboard in your browser
- Quick access to full Pi-hole management interface

## Actions

- View detailed statistics (`↵`)
- Enable/disable blocking (`⌘` + `E`/`⌘` + `D`)
- Refresh data (`⌘` + `R`)
- Open web dashboard (`⌘` + `O`)

## Preferences

- **Pi-hole URL**: Your Pi-hole instance URL (e.g., `http://192.168.1.100` or `http://pihole.mydomain.com`)
- **API Token**: Your Pi-hole API token (found in Settings > API/Web Interface)
- **Default Disable Time**: Default duration for timed disable (e.g., 5m, 1h)
- **Connection Timeout**: API connection timeout in seconds (default: 10)

## Setup

1. Install the extension from the Raycast store
2. Open Raycast preferences and configure the Pi-hole extension:
   - Enter your Pi-hole instance URL (including http:// or https://)
   - Add your API token from Pi-hole Settings > API/Web Interface
   - Optionally configure default disable time and connection timeout
3. Start managing your Pi-hole DNS server instantly

## Requirements

- Pi-hole instance (v5.0 or higher tested)
- Valid Pi-hole API token with admin privileges
- Network access to your Pi-hole instance

## Time Format Examples

When using the timed disable feature, you can use these formats:

- `5m` - 5 minutes
- `1h` - 1 hour
- `30s` - 30 seconds
- `2h30m` - 2 hours and 30 minutes

## Troubleshooting

- Ensure your Pi-hole URL is accessible from your machine
- Verify your API token is correct and has admin permissions
- Check that your Pi-hole instance is running and responsive
- Increase connection timeout if you experience timeout errors


---

Pi-hole® is a registered trademark of Pi-hole LLC. This project is not affiliated with, endorsed, or sponsored by Pi-hole LLC.
