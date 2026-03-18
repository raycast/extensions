# Tailscale Control

Control and inspect your local Tailscale node from Raycast.

## Features

- View local device status, peers, exit nodes, and health information
- Connect or disconnect Tailscale
- Copy Tailscale IPs and MagicDNS names
- Select or clear an exit node
- Ping peers and run `tailscale netcheck`
- Send and receive Taildrop files
- Toggle common advanced settings:
  - Accept DNS
  - Accept routes
  - Tailscale SSH
  - Web client
  - Shields up
  - Exit node LAN access
- View and manage Serve and Funnel status

## Requirements

- Tailscale must be installed on your Mac
- You must already be signed in to Tailscale locally

## Setup

The extension tries to auto-discover the Tailscale CLI in common locations, including:

- `/opt/homebrew/bin/tailscale`
- `/usr/local/bin/tailscale`

If Raycast still cannot find the CLI, open the extension preferences and set `Tailscale Path` manually.

## Notes

- This extension controls the local machine's Tailscale client
- It does not use the Tailscale admin API
