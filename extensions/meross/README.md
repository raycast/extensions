# Meross

Control your Meross smart plugs and power strips from Raycast.

## Commands

| Command                   | What it does                                                                                                                                                                      |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Search Devices**        | Lists all plugs (and each outlet of a power strip) with their on/off state and LAN IP. Press ↵ to toggle, or create a quicklink you can bind to a hotkey.                         |
| **Toggle Device**         | Pick an online device (type to filter) and toggle it with ↵. Raycast closes and confirms with a HUD.                                                                              |
| **Switch Device by Name** | Switches a device by name without opening a window. Used by hotkeys and by the quicklinks created in Search Devices. Arguments: device name and action (`toggle` / `on` / `off`). |
| **Menu Bar Devices**      | Shows how many plugs are on and lets you toggle them from the menu bar. Refreshes every 10 minutes.                                                                               |
| **Log out**               | Ends the Meross cloud session and removes the stored login token.                                                                                                                 |

## Setup

1. Enter the email address and password of your Meross account when Raycast asks for them. The region (EU, US, AP) is
   detected automatically.
2. If two-factor authentication is enabled on your account, open **Search Devices** once and enter the MFA code. The
   login token is stored and reused, so you don't need a new code for every command.

### Local network

With **Local Network** enabled (the default), the extension learns each plug's LAN IP address and sends commands
directly to the device. If the device doesn't answer locally (for example because your Mac is on a different network),
the command goes through the Meross cloud instead. Giving your plugs a fixed IP address in your router makes local
control more reliable.

## Supported devices

Plugs and power strips that can be switched on and off. Tested with the MSS210, MSS305 and MSS310. On power strips, each
outlet is listed separately, and the entry with the device name switches the whole strip. Lights, shutters, thermostats
and other device types are listed but can't be controlled yet.

## Disclaimer

This extension uses the unofficial Meross cloud and local API through the open-source [
`meross-cloud`](https://github.com/Apollon77/meross-cloud) library. It is not affiliated with or endorsed by Meross. A
firmware or cloud update from Meross can break it at any time.

MEROSS is a trademark of Chengdu Meross Technology Co., Ltd.
