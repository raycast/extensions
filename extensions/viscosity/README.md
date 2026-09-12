# Viscosity

Manage your [Viscosity](https://www.sparklabs.com/viscosity/) VPN connections directly from [Raycast](https://raycast.com): list, connect, and disconnect with ease.

## Features

- **List Connections**: Browse all your VPN connections, view their current status, and toggle them on/off.
- **Quick Connect**: Instantly connect to your favorite VPN or the first one in your list.
- **Disconnect All**: A quick way to end all active VPN sessions at once.
- **Quick Connect Preference**: Set a specific connection as your "Quick Connect" default directly from the list.

## Usage

### List Connections

This is the main command to manage your VPNs.

- **Enter** to toggle the connection (Connect/Disconnect).
- **Cmd + Shift + Q** to set or remove a connection as your Quick Connect default.
- **Cmd + R** to refresh the connection list.

### Quick Connect

Run this command to immediately initiate a connection to your preferred VPN. If no Quick Connect is set, it will attempt to connect to the first VPN in your list.

### Disconnect All

Useful when you want to quickly drop all active tunnels without going through the list.

## Prerequisites

- **Viscosity**: You must have the Viscosity app installed and configured on your Mac.
- **Permissions**: Raycast will request permission to control Viscosity via AppleScript the first time you run a command.

---

_Note: This extension is not affiliated with SparkLabs, the creators of Viscosity._
