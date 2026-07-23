# AirBuddy for Raycast

Control [AirBuddy](https://airbuddy.app) from Raycast — see live devices and batteries, connect and
disconnect, switch listening and Spatial Audio modes, and manage battery alerts.

Requires **AirBuddy 3.0 (build 912) or later**.

## Setup

This extension talks to AirBuddy over AppleScript, which needs **two** permissions. Both are off by
default, and the extension will show you which one is missing.

### 1. Enable scripting in AirBuddy

AirBuddy → Settings → Advanced → Security → turn on **"Enable Apple Script for automation."**

### 2. Allow Raycast to control AirBuddy

The first time you run a command, macOS asks whether Raycast may control AirBuddy. Choose **OK**.

If you dismissed it, turn it on manually: System Settings → Privacy & Security → Automation →
Raycast → enable **AirBuddyHelper**.

## Commands

| Command                       | What it does                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| **Devices**                   | Devices grouped by type, with batteries, listening mode, pin/favorite, and per-device actions |
| **Connect Nearest Headset**   | Connects to the headset AirBuddy considers closest                                            |
| **Connect Favorite Headset**  | Connects to the headset starred in AirBuddy                                                   |
| **Disconnect Headset**        | Disconnects the connected headset                                                             |
| **Toggle Listening Mode**     | Cycles the listening mode (AirBuddy picks the order)                                          |
| **Set Listening Mode**        | Sets a specific mode — Off, Noise Cancellation, Transparency, or Adaptive                     |
| **Toggle Spatial Audio**      | Toggles Spatial Audio on the current output device                                            |
| **Toggle Microphone Input**   | Toggles microphone input routing for the currently connected headset                          |
| **Toggle Audio Input Lock**   | Toggles AirBuddy's Audio Input Lock setting                                                   |
| **Cancel Device Connection**  | Cancels a pending headset connection                                                          |
| **Toggle Desktop Widgets**    | Shows or hides AirBuddy's Desktop Widgets overlay                                             |
| **Show Magic Handoff Picker** | Shows AirBuddy's Magic Handoff device picker                                                  |
| **Show AirBuddy Dashboard**   | Opens AirBuddy's device dashboard                                                             |

## Good to know

**Devices lists your full known roster by default, filtered to nearby-or-connected.** AirBuddy reports
every device it has ever paired — including ones that are offline right now — plus which of those are
currently live. The **Devices** command defaults to nearby-or-connected devices, matching the old
live-only view; switch the filter to **Known Devices** to see everything AirBuddy has ever paired,
including devices that are off or out of range.

**Pin and favorite are read-write from Raycast.** Star or unstar a headset as your favorite, and pin or
unpin any device, directly from its action panel — these changes apply immediately in AirBuddy too.

**Actions are asynchronous.** Connecting takes a moment. The extension waits for the device to actually
connect before reporting success rather than claiming it immediately. When AirBuddy can tell up front
that an action won't apply — say, disconnecting a headset that's already disconnected — the extension
reports that immediately instead of waiting out a timeout.

## Credits and attribution

**AirBuddy** is by [Gui Rambo](https://www.rambo.codes/). This extension is an unofficial companion to it and
is not affiliated with or endorsed by AirBuddy. The extension icon is AirBuddy's own app icon, used to
identify the app this extension controls.

**Device icons are [SF Symbols](https://developer.apple.com/sf-symbols/)**, provided by Apple and used
under the [SF Symbols license](https://developer.apple.com/fonts/).
