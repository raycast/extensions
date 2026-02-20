# Elgato Light

Control Elgato lights with auto-discovery or by IP address.

## Features

- **Auto-Discovery**: Automatically finds Elgato lights on your network using Bonjour/mDNS. No configuration required.
- **IP Address Fallback**: If auto-discovery is unreliable on your network, set light IP addresses manually in extension preferences. Supports multiple lights via comma-separated IPs.
- **Day and Night Presets**: Quickly switch between configurable day light and night light brightness and temperature settings.
- **Set Exact Temperature**: Set a specific color temperature value (2900K-7000K) rather than just stepping warmer or cooler.
- **Multi-Light Support**: All commands control every discovered or configured light simultaneously.
- **AI Integration**: Control your lights through Raycast AI with natural language. Say things like "turn on my lights", "switch to night mode", or "set temperature to 4000K" (requires Raycast Pro).

## Setup

No setup is required for most users. The extension automatically discovers Elgato lights on your local network.

If auto-discovery is unreliable, open the extension preferences and enter your light IP addresses as a comma-separated list (e.g., `192.168.0.25, 192.168.0.26`).

## Commands

| Command | Description |
|---------|-------------|
| Turn on | Turn light(s) on to default brightness and temperature |
| Turn off | Turn light(s) off |
| Turn on Day Light | Turn light(s) on with day light settings |
| Turn on Night Light | Turn light(s) on with night light settings |
| Increase Brightness | Increase the brightness of light(s) |
| Decrease Brightness | Decrease the brightness of light(s) |
| Set Temperature | Set the color temperature to a specific value |
| Discover Lights | Discover lights on the network and cache them |
| Clear Light Cache | Clear the cached light discovery data |

## Preferences

All preferences are optional with sensible defaults:

- **IP Addresses**: Comma-separated list of light IPs (leave empty for auto-discovery)
- **Brightness Increment Amount**: How much to change brightness per step (default: 5)
- **Default Brightness / Temperature**: Settings for the Turn on command
- **Day Light Brightness / Temperature**: Settings for the Turn on Day Light command
- **Night Light Brightness / Temperature**: Settings for the Turn on Night Light command
