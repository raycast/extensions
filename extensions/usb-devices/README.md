# USB Devices

See every USB device connected to your Mac, what it is, how fast it's linked and what it's plugged into.

## Views

- **By Type**: devices grouped by what they do (Audio & MIDI, Storage, Input, Phones & Cameras, Serial & Dev Boards, Network & Wireless, Security, Display & Monitor…)
- **By Hub / Port**: devices grouped by the hub they're plugged into
- **By Hubs & Internals**: the hubs themselves and the controller chips inside docks and monitors

The USB 2 and USB 3 halves of a hub are shown as one hub. The Filter Type dropdown narrows the list to one type.

## Details

Each device shows its type, vendor and product IDs, link speed and USB version, power, path through your hubs, interfaces, drivers, volumes, serial ports and network interfaces.

- Click any pill to copy its value.
- Pills in **Path ↗** and **On This Hub ↗** jump to that device.
- An orange warning appears when a USB 3 device is running at USB 2 speed, which usually means a cable, adapter or hub problem.

The list updates live while open: new devices get a **New** tag, and unplugged ones stay in **Just Disconnected** for a minute.

## Show in System Information

This action opens System Information on the USB section and selects the device. It works by clicking through the System Information window, so macOS asks for two permissions the first time:

- **Accessibility**: System Settings → Privacy & Security → Accessibility → Raycast
- **Automation**: System Settings → Privacy & Security → Automation → Raycast → System Events

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Show in System Information | ↩ |
| Show / Hide Details | ⌘↩ |
| Go to Device on This Hub | ⌘] |
| Go to Parent | ⌘[ |
| Set Icon | ⌘I |
| Show Volume in Finder | ⌘⇧F |
| Eject Disk | ⌘E |
| Copy Summary | ⌘⇧C |
| Copy Name | ⌘⌥C |
| Copy Vendor:Product ID | ⌘⇧I |
| Copy as JSON | ⌘⇧J |
| Refresh | ⌘R |
| Show Raw Properties | ⌘⇧R |

## How It Works

Device data comes from `ioreg`, and volume mount points from `diskutil`. Both are built into macOS, so there are no helper binaries and nothing needs admin rights.
