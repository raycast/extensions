# Handoff Toggle

Toggle macOS Handoff feature directly from Raycast. Quickly enable or disable Handoff functionality and check its current status.

## Features

- Toggle Handoff on/off with a single command
- Check current Handoff status
- Instant visual feedback
- No configuration required

## Commands

### Toggle Handoff
Toggles the Handoff feature between enabled and disabled states.

### Check Handoff Status
Displays whether Handoff is currently enabled or disabled.

## Installation

1. Install [Raycast](https://raycast.com/)
2. Search for "Handoff Toggle" in Raycast Store
3. Click Install

## Requirements

- macOS 10.15 or later
- Raycast

## How It Works

The extension manages the Handoff feature by modifying the system preference:
```
~/Library/Preferences/com.apple.coreservices.useractivityd.plist
```

## Troubleshooting

If commands aren't working:
1. Ensure Raycast has Full Disk Access (System Settings → Privacy & Security → Full Disk Access)
2. Try restarting Raycast