# Clash Verge Rev

A Raycast extension for quickly switching Clash Verge Rev proxy modes and nodes.

## About Clash Verge Rev

[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) is a continuation of Clash Verge, a rule-based tunnel in Go with a modern GUI client.

## Features

- **Switch Proxy Mode**: Quickly switch between Rule, Global, and Direct modes
- **Switch Proxy Node**: Select and switch proxy nodes with group support
- **View Status**: Monitor current Clash status and connection information
- **Node Selection Memory**: Remembers your last selected proxy group for faster access
- **Auto Close Connections**: Optionally close existing connections when switching

## Setup

### Prerequisites

Make sure you have [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) installed and running on your system.

### 1. Enable Clash API

First, ensure that Clash Verge Rev has the API enabled:

1. Open Clash Verge Rev
2. Go to Settings → Clash Setting → External
3. Enable "External Controller"
4. Note the API address (usually `http://127.0.0.1:9097`)
5. Set an API secret if desired (recommended for security)

### 2. Configure Extension

1. Install the extension from Raycast Store
2. Open any command from the extension
3. Configure the following preferences:
   - **Clash API URL**: The API endpoint (default: `http://127.0.0.1:9097`)
   - **Clash API Secret**: Your API authentication secret (optional but recommended)
   - **Auto Close Connections**: Whether to close existing connections when switching
   - **Refresh Interval**: How often to refresh status information

## Commands

### Switch Proxy Mode
Switch between different proxy modes:
- **Rule**: Route traffic based on rules
- **Global**: Route all traffic through proxy
- **Direct**: Direct connection without proxy

### Switch Proxy Node
Select and switch proxy nodes:
- Browse proxy groups
- Select specific nodes within groups
- Remembers your last selected group for quick access

### View Status
Monitor current Clash status:
- Current proxy mode
- Active proxy nodes
- Connection statistics
- Real-time updates

## Troubleshooting

### Connection Issues
- Verify Clash Verge Rev is running
- Check that the API URL is correct
- Ensure the API secret matches (if set)
- Confirm External Controller is enabled in Clash settings

### Permission Issues
- Make sure Clash Verge Rev allows external API access
- Check firewall settings if using a custom API address

## Privacy

This extension only communicates with your local Clash instance. No data is sent to external servers.
