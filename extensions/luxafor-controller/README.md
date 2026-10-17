# Luxafor Controller

Control your Luxafor LED device directly from Raycast with real-time status monitoring and quick color controls. Perfect for developers, streamers, or anyone who wants quick access to their Luxafor device controls.

## Key Features

* **Basic Controls**: Turn device on/off, set solid colors (red, green, blue, yellow, cyan, magenta, white)
* **Blink Effects**: Make your device blink with any of the basic colors
* **Connection Testing**: Test if your device is reachable and monitor health
* **Menubar Status**: Real-time status indicator in your menubar showing current color and device status
* **Global State Management**: Keeps menubar and main UI in sync with smart auto-refresh

## Setup

### Prerequisites

* Raycast installed on macOS
* Luxafor device (Flag, Orb, Bluetooth Pro, etc.)
* Luxafor software running with Webhook mode enabled

### Quick Setup

1. **Get your Luxafor User ID**:
   - Open Luxafor software
   - Go to the "Webhook" tab
   - Copy your User ID

2. **Configure the extension**:
   - Open Raycast preferences
   - Go to Extensions → Luxafor Controller
   - Enter your User ID
   - Choose your preferred API endpoint (US or UK)

3. **Enable menubar status** (optional):
   - The "Luxafor Status" command will appear in your menubar
   - Shows current device color and status
   - Provides quick access to common actions

## Commands

### Control Luxafor
Main interface for controlling your device with full color options and patterns.

### Luxafor Status (Menubar)
Shows real-time device status in your menubar:
* **Color indicator**: Shows current device color with matching icon tint
* **Online/offline status**: Real-time connection status
* **Quick actions**: Turn off, set red/green/blue directly from menubar
* **Customise**: Choose from a simple red/green toggle menu or a colorful menu
* **Auto-refresh**: Updates every 30 seconds (won't overwrite recent user actions)

## Frequently Asked Questions

**Do I need the Luxafor software running?**

Yes. The extension uses the official Luxafor Webhook API, so the Luxafor app must be running with Webhook mode enabled.

**My device isn't responding.**

Check your User ID is correct (from Luxafor app → Webhook tab), ensure Luxafor software is running, and verify your device is connected and powered on. Try the "Test Connection" feature first.

**The menubar isn't showing.**

Make sure the "Luxafor Status" command is enabled in Raycast preferences. Restart Raycast if needed.

**Can I control the device without the menubar?**

Yes. The main "Control Luxafor" command provides full access to all features without needing the menubar integration.

**How often does it update?**

The menubar status updates every 30 seconds automatically, but won't interfere with recent user actions.

## Troubleshooting

**Device not responding?**
* Check your User ID is correct
* Ensure Luxafor software is running
* Verify your device is connected and powered on
* Try the "Test Connection" feature

**API errors?**
* Check your internet connection
* Verify the API endpoint is correct
* Ensure your User ID is valid

**Still having issues?**
* Check the Luxafor software logs
* Verify your device supports webhook API
* Try restarting Luxafor software

## Supported Devices

* Luxafor Flag (Tested to work)
* Luxafor Colorblind Flag  
* Luxafor Orb
* Luxafor Bluetooth Pro
* Luxafor Bluetooth