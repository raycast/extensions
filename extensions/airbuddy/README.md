# AirBuddy for Raycast

Control [AirBuddy](https://airbuddy.app) from Raycast — see live devices and batteries, connect and
disconnect, switch listening and Spatial Audio modes, and manage battery alerts.

Requires **AirBuddy 3.0 or later**.

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

| Command                      | What it does                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| **Devices**                  | Live devices grouped by type, with batteries, listening mode, and per-device actions |
| **Connect Nearest Headset**  | Connects to the headset AirBuddy considers closest                                   |
| **Connect Favorite Headset** | Connects to the headset starred in AirBuddy                                          |
| **Disconnect Headset**       | Disconnects the connected headset                                                    |
| **Toggle Listening Mode**    | Cycles the listening mode (AirBuddy picks the order)                                 |
| **Set Listening Mode**       | Sets a specific mode — Off, Noise Cancellation, Transparency, or Adaptive            |
| **Toggle Spatial Audio**     | Toggles Spatial Audio on the current output device                                   |
| **Show AirBuddy Dashboard**  | Opens AirBuddy's device dashboard                                                    |

## Good to know

**Only live devices appear.** AirBuddy's scripting API reports the devices it can currently see — not
your full roster. AirPods in their case, a powered-off Mac, or a pinned-but-absent device won't be
listed. Devices appearing and disappearing as they come in and out of range is normal.

**Pins aren't visible, and favorites are read-only.** AirBuddy's pin settings aren't exposed to
AppleScript at all. Your favorite headset _can_ be read — that's what **Connect Favorite Headset** uses,
and it works even when the headset is in its case — but it can't be changed from here. Star a headset in
AirBuddy's own Devices settings.

**Actions are asynchronous.** Connecting takes a moment. The extension waits for the device to actually
connect before reporting success rather than claiming it immediately.

## Credits and attribution

**AirBuddy** is by [Gui Rambo](https://www.rambo.codes/). This extension is an unofficial companion to it and
is not affiliated with or endorsed by AirBuddy. The extension icon is AirBuddy's own app icon, used to
identify the app this extension controls.

**Device icons are [SF Symbols](https://developer.apple.com/sf-symbols/)**, provided by Apple and used
under the [SF Symbols license](https://developer.apple.com/fonts/).
